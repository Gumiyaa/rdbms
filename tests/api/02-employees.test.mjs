import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

import { createClient } from '../harness/client.mjs';
import {
  apiBaseUrl,
  cleanup,
  expectError,
  expectSuccess,
  loginOk,
  uniqueSuffix,
} from '../harness/util.mjs';

const client = createClient(apiBaseUrl());
const createdIds = [];

let seedEmployee;
let created;

before(async () => {
  await loginOk(client);

  const list = expectSuccess(await client.get('/employees.php?q=HR-2023001'));
  seedEmployee = list[0];

  assert.ok(seedEmployee, 'data seed Budi Santoso harus ada');
});

after(async () => {
  await cleanup(client, '/employees.php', createdIds);
});

test('GET daftar karyawan mengembalikan data seed + meta.total', async () => {
  const response = await client.get('/employees.php');
  const data = expectSuccess(response);

  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 9, `minimal 9 karyawan seed, dapat ${data.length}`);
  assert.equal(response.body.meta.total, data.length);

  const first = data[0];
  assert.equal(typeof first.id, 'number');
  assert.equal(typeof first.nip, 'string');
  assert.equal(typeof first.nama, 'string');
  assert.equal(typeof first.status, 'string');
});

test('GET detail karyawan dan 404 untuk id yang tidak ada', async () => {
  const detail = expectSuccess(await client.get(`/employees.php?id=${seedEmployee.id}`));

  assert.equal(detail.id, seedEmployee.id);
  assert.equal(detail.nip, 'HR-2023001');
  assert.equal(detail.nama, 'Budi Santoso');
  assert.equal(detail.departemen, 'Teknologi Informasi');

  expectError(await client.get('/employees.php?id=999999'), 404);
});

test('filter q, status, dan department_id bekerja', async () => {
  const byQuery = expectSuccess(await client.get('/employees.php?q=HR-2023001'));
  assert.equal(byQuery.length, 1);
  assert.equal(byQuery[0].nip, 'HR-2023001');

  const active = expectSuccess(await client.get('/employees.php?status=Aktif'));
  assert.ok(active.length >= 7);
  assert.ok(active.every((row) => row.status === 'Aktif'));

  const byDepartment = expectSuccess(
    await client.get(`/employees.php?department_id=${seedEmployee.departemen_id}`)
  );
  assert.ok(byDepartment.length >= 1);
  assert.ok(byDepartment.every((row) => row.departemen_id === seedEmployee.departemen_id));
  assert.ok(byDepartment.some((row) => row.id === seedEmployee.id));
});

test('POST membuat karyawan baru', async () => {
  const suffix = uniqueSuffix();

  const response = await client.post('/employees.php', {
    nip: `HR-T${suffix}`,
    nama: `Karyawan Uji ${suffix}`,
    email: `uji.${suffix}@company.id`,
    departemen_id: seedEmployee.departemen_id,
    jabatan_id: seedEmployee.jabatan_id,
    status: 'Aktif',
    telepon: '0812-0000-1111',
    join_date: '2024-01-15',
  });

  created = expectSuccess(response, 201);
  createdIds.push(created.id);

  assert.equal(created.nip, `HR-T${suffix}`);
  assert.equal(created.nama, `Karyawan Uji ${suffix}`);
  assert.equal(created.name, `Karyawan Uji ${suffix}`);
  assert.equal(created.email, `uji.${suffix}@company.id`);
  assert.equal(created.departemen, 'Teknologi Informasi');
  assert.equal(created.jabatan, 'Software Engineer Lead');
  assert.equal(created.status, 'Aktif');
  assert.equal(created.telepon, '0812-0000-1111');
  assert.equal(created.join_date, '2024-01-15');
  assert.match(created.avatar, /^https?:\/\//);

  const detail = expectSuccess(await client.get(`/employees.php?id=${created.id}`));
  assert.equal(detail.id, created.id);
});

test('POST tanpa NIP membuat NIP otomatis', async () => {
  const suffix = uniqueSuffix();
  const employee = expectSuccess(
    await client.post('/employees.php', {
      nama: `Tanpa NIP ${suffix}`,
      email: `tanpa-nip.${suffix}@company.id`,
    }),
    201
  );

  createdIds.push(employee.id);

  assert.match(employee.nip, /^HR-\d+$/);
  assert.equal(employee.status, 'Aktif');
  assert.match(employee.join_date, /^\d{4}-\d{2}-\d{2}$/);

  expectSuccess(await client.del(`/employees.php?id=${employee.id}`));
});

test('POST memvalidasi field wajib, enum, tanggal, dan relasi', async () => {
  const empty = expectError(await client.post('/employees.php', {}), 422);
  assert.ok(empty.errors.nama);
  assert.ok(empty.errors.email);

  const badStatus = expectError(
    await client.post('/employees.php', {
      nama: 'Status Salah',
      email: `status.${uniqueSuffix()}@company.id`,
      status: 'Kontrak',
    }),
    422
  );
  assert.ok(badStatus.errors.status);

  const badDepartment = expectError(
    await client.post('/employees.php', {
      nama: 'Departemen Salah',
      email: `dept.${uniqueSuffix()}@company.id`,
      departemen_id: 999999,
    }),
    422
  );
  assert.equal(badDepartment.errors.departemen_id, 'Departemen tidak ditemukan.');

  const badDate = expectError(
    await client.post('/employees.php', {
      nama: 'Tanggal Salah',
      email: `tanggal.${uniqueSuffix()}@company.id`,
      join_date: '2024-02-31',
    }),
    422
  );
  assert.ok(badDate.errors.join_date);
});

test('POST menolak NIP dan email duplikat', async () => {
  assert.ok(created, 'tes create harus berhasil lebih dulu');

  const body = expectError(
    await client.post('/employees.php', {
      nip: created.nip,
      nama: 'Duplikat',
      email: created.email,
    }),
    422
  );

  assert.equal(body.errors.nip, 'NIP sudah digunakan karyawan lain.');
  assert.equal(body.errors.email, 'Email sudah digunakan karyawan lain.');
});

test('PUT mengubah sebagian data tanpa menghapus field lain', async () => {
  assert.ok(created, 'tes create harus berhasil lebih dulu');

  const updated = expectSuccess(
    await client.put(`/employees.php?id=${created.id}`, { status: 'Cuti' })
  );

  assert.equal(updated.id, created.id);
  assert.equal(updated.status, 'Cuti');
  assert.equal(updated.nama, created.nama);
  assert.equal(updated.nip, created.nip);
  assert.ok(updated.updated_at);
});

test('PUT/DELETE tanpa id atau id tidak dikenal memberi 400/404', async () => {
  const missingPut = expectError(await client.put('/employees.php', { status: 'Aktif' }), 400);
  assert.equal(missingPut.message, 'Parameter id wajib diisi.');

  expectError(await client.put('/employees.php?id=999999', { status: 'Aktif' }), 404);

  const missingDelete = expectError(await client.del('/employees.php'), 400);
  assert.equal(missingDelete.message, 'Parameter id wajib diisi.');

  expectError(await client.del('/employees.php?id=999999'), 404);
});

test('menghapus karyawan menghapus absensi & cuti terkait (cascade)', async () => {
  const suffix = uniqueSuffix();

  const employee = expectSuccess(
    await client.post('/employees.php', {
      nama: `Cascade ${suffix}`,
      email: `cascade.${suffix}@company.id`,
    }),
    201
  );
  createdIds.push(employee.id);

  const attendance = expectSuccess(
    await client.post('/attendances.php', {
      employee_id: employee.id,
      tanggal: '2002-02-02',
      status: 'Hadir',
    }),
    201
  );

  const leave = expectSuccess(
    await client.post('/leave_requests.php', {
      employee_id: employee.id,
      jenis: 'Izin',
      tanggal_mulai: '2002-03-01',
      tanggal_selesai: '2002-03-02',
      alasan: 'uji cascade',
    }),
    201
  );

  expectSuccess(await client.del(`/employees.php?id=${employee.id}`));

  const remainingAttendance = expectSuccess(
    await client.get(`/attendances.php?employee_id=${employee.id}`)
  );
  assert.equal(remainingAttendance.length, 0);

  expectError(await client.get(`/leave_requests.php?id=${leave.id}`), 404);
});

test('DELETE menghapus karyawan', async () => {
  assert.ok(created, 'tes create harus berhasil lebih dulu');

  const result = expectSuccess(await client.del(`/employees.php?id=${created.id}`));
  assert.equal(result.deleted, true);
  assert.equal(result.id, created.id);

  expectError(await client.get(`/employees.php?id=${created.id}`), 404);
  expectError(await client.del(`/employees.php?id=${created.id}`), 404);
});
