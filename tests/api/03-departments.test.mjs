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
const departmentIds = [];
const employeeIds = [];

let head;
let created;

before(async () => {
  await loginOk(client);

  const employees = expectSuccess(await client.get('/employees.php?q=HR-2023001'));
  head = employees[0];
  assert.ok(head, 'data seed Budi Santoso harus ada');
});

after(async () => {
  await cleanup(client, '/employees.php', employeeIds);
  await cleanup(client, '/departments.php', departmentIds);
});

test('GET daftar departemen mengembalikan data seed + meta.total', async () => {
  const response = await client.get('/departments.php');
  const data = expectSuccess(response);

  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 6);
  assert.equal(response.body.meta.total, data.length);

  const seed = data.find((row) => row.kode === 'DEPT-TI');
  assert.ok(seed);
  assert.equal(seed.nama, 'Teknologi Informasi');
  assert.equal(seed.budget, 450_000_000);
  assert.equal(seed.anggaran, 'Rp 450 JT');
  assert.ok(seed.anggota >= 1);
});

test('GET detail departemen dan 404 untuk id yang tidak ada', async () => {
  const list = expectSuccess(await client.get('/departments.php'));
  const seed = list.find((row) => row.kode === 'DEPT-TI');

  const detail = expectSuccess(await client.get(`/departments.php?id=${seed.id}`));
  assert.equal(detail.id, seed.id);
  assert.equal(detail.kepala, 'Budi Santoso');

  expectError(await client.get('/departments.php?id=999999'), 404);
});

test('POST membuat departemen dengan anggaran teks dan kepala', async () => {
  const suffix = uniqueSuffix();

  const response = await client.post('/departments.php', {
    nama: `QA & Uji ${suffix}`,
    kode: `QA-${suffix}`,
    lokasi: 'Lantai 9 - Gedung Uji',
    anggaran: 'Rp 450 JT',
    kepala_id: head.id,
  });

  created = expectSuccess(response, 201);
  departmentIds.push(created.id);

  assert.equal(created.kode, `QA-${suffix.toUpperCase()}`);
  assert.equal(created.nama, `QA & Uji ${suffix}`);
  assert.equal(created.budget, 450_000_000);
  assert.equal(created.anggaran, 'Rp 450 JT');
  assert.equal(created.kepala, 'Budi Santoso');
  assert.equal(created.kepala_id, head.id);
  assert.equal(created.anggota, 0);

  const detail = expectSuccess(await client.get(`/departments.php?id=${created.id}`));
  assert.equal(detail.id, created.id);
});

test('POST tanpa kode membuat kode otomatis dan menerima anggaran angka', async () => {
  const suffix = uniqueSuffix();
  const department = expectSuccess(
    await client.post('/departments.php', {
      nama: `Departemen Otomatis ${suffix}`,
      anggaran: 1_250_000,
    }),
    201
  );

  departmentIds.push(department.id);

  assert.match(department.kode, /^DEPT-/);
  assert.equal(department.budget, 1_250_000);
  assert.match(department.anggaran, /^Rp /);
});

test('POST memvalidasi nama, anggaran, dan duplikat', async () => {
  const empty = expectError(await client.post('/departments.php', {}), 422);
  assert.ok(empty.errors.nama);

  const badBudget = expectError(
    await client.post('/departments.php', {
      nama: `Anggaran Salah ${uniqueSuffix()}`,
      anggaran: 'banyak',
    }),
    422
  );
  assert.ok(badBudget.errors.anggaran);

  assert.ok(created, 'tes create harus berhasil lebih dulu');

  const duplicate = expectError(
    await client.post('/departments.php', {
      nama: created.nama,
      kode: created.kode,
    }),
    422
  );
  assert.ok(duplicate.errors.nama);
  assert.ok(duplicate.errors.kode);
});

test('PUT mengubah anggaran teks dan field lain secara parsial', async () => {
  assert.ok(created, 'tes create harus berhasil lebih dulu');

  const updated = expectSuccess(
    await client.put(`/departments.php?id=${created.id}`, {
      anggaran: '1,5 M',
      lokasi: 'Lantai 10',
    })
  );

  assert.equal(updated.budget, 1_500_000_000);
  assert.equal(updated.anggaran, 'Rp 1,5 M');
  assert.equal(updated.lokasi, 'Lantai 10');
  assert.equal(updated.nama, created.nama);

  const renamed = expectSuccess(
    await client.put(`/departments.php?id=${created.id}`, {
      nama: `QA Renamed ${uniqueSuffix()}`,
    })
  );

  assert.notEqual(renamed.nama, created.nama);
  assert.equal(renamed.kode, created.kode);
  assert.equal(renamed.budget, 1_500_000_000);
});

test('PUT/DELETE tanpa id atau id tidak dikenal memberi 400/404', async () => {
  const missingPut = expectError(await client.put('/departments.php', { nama: 'X' }), 400);
  assert.equal(missingPut.message, 'Parameter id wajib diisi.');

  expectError(await client.put('/departments.php?id=999999', { nama: 'X' }), 404);

  const missingDelete = expectError(await client.del('/departments.php'), 400);
  assert.equal(missingDelete.message, 'Parameter id wajib diisi.');

  expectError(await client.del('/departments.php?id=999999'), 404);
});

test('menghapus departemen membuat department_id karyawan menjadi null', async () => {
  const suffix = uniqueSuffix();

  const department = expectSuccess(
    await client.post('/departments.php', { nama: `Set Null ${suffix}` }),
    201
  );
  departmentIds.push(department.id);

  const employee = expectSuccess(
    await client.post('/employees.php', {
      nama: `Karyawan Set Null ${suffix}`,
      email: `set-null.${suffix}@company.id`,
      departemen_id: department.id,
    }),
    201
  );
  employeeIds.push(employee.id);

  assert.equal(employee.departemen_id, department.id);

  expectSuccess(await client.del(`/departments.php?id=${department.id}`));

  const afterDelete = expectSuccess(await client.get(`/employees.php?id=${employee.id}`));
  assert.equal(afterDelete.departemen_id, null);
  assert.equal(afterDelete.departemen, '-');
  assert.equal(afterDelete.nip, employee.nip);
});

test('DELETE menghapus departemen', async () => {
  assert.ok(created, 'tes create harus berhasil lebih dulu');

  const result = expectSuccess(await client.del(`/departments.php?id=${created.id}`));
  assert.equal(result.deleted, true);

  expectError(await client.get(`/departments.php?id=${created.id}`), 404);
  expectError(await client.del(`/departments.php?id=${created.id}`), 404);
});
