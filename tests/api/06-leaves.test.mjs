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

let adminId;
let budi;
let created;

before(async () => {
  const session = await loginOk(client);
  adminId = session.user.employee_id;

  const budiList = expectSuccess(await client.get('/employees.php?q=HR-2023001'));
  budi = budiList[0];
  assert.ok(budi, 'data seed Budi Santoso harus ada');
});

after(async () => {
  await cleanup(client, '/leave_requests.php', createdIds);
});

test('GET daftar cuti mengembalikan data seed + meta.total', async () => {
  const response = await client.get('/leave_requests.php');
  const data = expectSuccess(response);

  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 4);
  assert.equal(response.body.meta.total, data.length);

  const row = data[0];
  assert.equal(typeof row.id, 'number');
  assert.equal(typeof row.employee_id, 'number');
  assert.equal(typeof row.nip, 'string');
  assert.ok(['Cuti Tahunan', 'Sakit', 'Izin'].includes(row.jenis));
  assert.ok(['pending', 'approved', 'rejected'].includes(row.status));
});

test('filter status dan employee_id bekerja', async () => {
  const pending = expectSuccess(await client.get('/leave_requests.php?status=pending'));
  assert.ok(pending.length >= 2);
  assert.ok(pending.every((row) => row.status === 'pending'));

  const byEmployee = expectSuccess(
    await client.get(`/leave_requests.php?employee_id=${budi.id}`)
  );
  assert.ok(byEmployee.every((row) => row.employee_id === budi.id));
});

test('GET detail cuti dan 404 untuk id yang tidak ada', async () => {
  const list = expectSuccess(await client.get('/leave_requests.php'));
  const seed = list[0];

  const detail = expectSuccess(await client.get(`/leave_requests.php?id=${seed.id}`));
  assert.equal(detail.id, seed.id);

  expectError(await client.get('/leave_requests.php?id=999999'), 404);
});

test('POST membuat pengajuan cuti untuk user login secara default', async () => {
  const response = await client.post('/leave_requests.php', {
    jenis: 'Cuti Tahunan',
    tanggal_mulai: '2003-01-10',
    tanggal_selesai: '2003-01-12',
    alasan: 'Liburan bersama keluarga.',
  });

  created = expectSuccess(response, 201);
  createdIds.push(created.id);

  assert.equal(created.employee_id, adminId);
  assert.equal(created.jenis, 'Cuti Tahunan');
  assert.equal(created.type, 'Cuti Tahunan');
  assert.equal(created.tanggal_mulai, '2003-01-10');
  assert.equal(created.tanggal_selesai, '2003-01-12');
  assert.equal(created.alasan, 'Liburan bersama keluarga.');
  assert.equal(created.status, 'pending');
});

test('POST menerima employee_id eksplisit dan status awal', async () => {
  const leave = expectSuccess(
    await client.post('/leave_requests.php', {
      employee_id: budi.id,
      jenis: 'Izin',
      tanggal_mulai: '2003-02-01',
      tanggal_selesai: '2003-02-02',
      alasan: `Izin uji ${uniqueSuffix()}`,
      status: 'approved',
    }),
    201
  );

  createdIds.push(leave.id);

  assert.equal(leave.employee_id, budi.id);
  assert.equal(leave.status, 'approved');
  assert.equal(leave.jenis, 'Izin');
});

test('POST memvalidasi tanggal, jenis, status, dan relasi', async () => {
  const empty = expectError(await client.post('/leave_requests.php', {}), 422);
  assert.ok(empty.errors.tanggal_mulai);
  assert.ok(empty.errors.tanggal_selesai);

  const invalid = expectError(
    await client.post('/leave_requests.php', {
      jenis: 'Libur',
      status: 'done',
      tanggal_mulai: 'x',
      tanggal_selesai: 'y',
    }),
    422
  );
  assert.ok(invalid.errors.jenis);
  assert.ok(invalid.errors.status);
  assert.ok(invalid.errors.tanggal_mulai);
  assert.ok(invalid.errors.tanggal_selesai);

  const reversed = expectError(
    await client.post('/leave_requests.php', {
      tanggal_mulai: '2003-03-10',
      tanggal_selesai: '2003-03-01',
    }),
    422
  );
  assert.equal(
    reversed.errors.tanggal_selesai,
    'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.'
  );

  const missingEmployee = expectError(
    await client.post('/leave_requests.php', {
      employee_id: 999999,
      tanggal_mulai: '2003-03-10',
      tanggal_selesai: '2003-03-11',
    }),
    422
  );
  assert.equal(missingEmployee.errors.employee_id, 'Karyawan tidak ditemukan.');
});

test('PUT mengubah status dan data cuti', async () => {
  assert.ok(created, 'tes create harus berhasil lebih dulu');

  const approved = expectSuccess(
    await client.put(`/leave_requests.php?id=${created.id}`, { status: 'approved' })
  );
  assert.equal(approved.status, 'approved');
  assert.equal(approved.employee_id, created.employee_id);

  const rejected = expectSuccess(
    await client.put(`/leave_requests.php?id=${created.id}`, {
      status: 'rejected',
      alasan: 'Ditolak oleh tes otomatis.',
    })
  );
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.alasan, 'Ditolak oleh tes otomatis.');
  assert.equal(rejected.jenis, created.jenis);
});

test('PUT/DELETE tanpa id atau id tidak dikenal memberi 400/404', async () => {
  const missingPut = expectError(await client.put('/leave_requests.php', { status: 'approved' }), 400);
  assert.equal(missingPut.message, 'Parameter id wajib diisi.');

  expectError(await client.put('/leave_requests.php?id=999999', { status: 'approved' }), 404);

  const missingDelete = expectError(await client.del('/leave_requests.php'), 400);
  assert.equal(missingDelete.message, 'Parameter id wajib diisi.');

  expectError(await client.del('/leave_requests.php?id=999999'), 404);
});

test('DELETE menghapus pengajuan cuti', async () => {
  assert.ok(created, 'tes create harus berhasil lebih dulu');

  const result = expectSuccess(await client.del(`/leave_requests.php?id=${created.id}`));
  assert.equal(result.deleted, true);

  expectError(await client.get(`/leave_requests.php?id=${created.id}`), 404);
  expectError(await client.del(`/leave_requests.php?id=${created.id}`), 404);
});
