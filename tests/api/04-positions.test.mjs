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
const positionIds = [];
const employeeIds = [];

let created;

before(async () => {
  await loginOk(client);
});

after(async () => {
  await cleanup(client, '/employees.php', employeeIds);
  await cleanup(client, '/positions.php', positionIds);
});

test('GET daftar jabatan mengembalikan data seed + meta.total', async () => {
  const response = await client.get('/positions.php');
  const data = expectSuccess(response);

  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 8);
  assert.equal(response.body.meta.total, data.length);

  const seed = data.find((row) => row.kode === 'JAB-001');
  assert.ok(seed);
  assert.equal(seed.nama, 'Software Engineer Lead');
  assert.equal(seed.level, 'Manager');
  assert.equal(seed.gajiMin, 15_000_000);
  assert.equal(seed.gajiMax, 22_000_000);
  assert.ok(seed.pemegang >= 1);
});

test('GET detail jabatan dan 404 untuk id yang tidak ada', async () => {
  const list = expectSuccess(await client.get('/positions.php'));
  const seed = list.find((row) => row.kode === 'JAB-001');

  const detail = expectSuccess(await client.get(`/positions.php?id=${seed.id}`));
  assert.equal(detail.id, seed.id);
  assert.equal(detail.nama, 'Software Engineer Lead');

  expectError(await client.get('/positions.php?id=999999'), 404);
});

test('POST membuat jabatan baru', async () => {
  const suffix = uniqueSuffix();

  const response = await client.post('/positions.php', {
    nama: `QA Engineer ${suffix}`,
    kode: `POS-${suffix}`,
    level: 'Senior',
    gajiMin: 9_000_000,
    gajiMax: 12_000_000,
  });

  created = expectSuccess(response, 201);
  positionIds.push(created.id);

  assert.equal(created.kode, `POS-${suffix.toUpperCase()}`);
  assert.equal(created.nama, `QA Engineer ${suffix}`);
  assert.equal(created.level, 'Senior');
  assert.equal(created.gajiMin, 9_000_000);
  assert.equal(created.gajiMax, 12_000_000);
  assert.equal(created.salary_min, 9_000_000);
  assert.equal(created.salary_max, 12_000_000);
  assert.equal(created.pemegang, 0);
});

test('POST tanpa kode membuat kode jabatan otomatis', async () => {
  const suffix = uniqueSuffix();
  const position = expectSuccess(
    await client.post('/positions.php', {
      nama: `Jabatan Otomatis ${suffix}`,
      level: 'Staff',
      gajiMin: 5_000_000,
      gajiMax: 7_000_000,
    }),
    201
  );

  positionIds.push(position.id);

  assert.match(position.kode, /^JAB-\d{3,}$/);
  assert.equal(position.level, 'Staff');
});

test('POST memvalidasi nama, level, gaji, dan duplikat', async () => {
  const empty = expectError(await client.post('/positions.php', {}), 422);
  assert.ok(empty.errors.nama);

  const badLevel = expectError(
    await client.post('/positions.php', {
      nama: `Level Salah ${uniqueSuffix()}`,
      level: 'Direktur',
    }),
    422
  );
  assert.ok(badLevel.errors.level);

  const negative = expectError(
    await client.post('/positions.php', {
      nama: `Gaji Negatif ${uniqueSuffix()}`,
      level: 'Staff',
      gajiMin: -1,
      gajiMax: 5_000_000,
    }),
    422
  );
  assert.ok(negative.errors.gajiMin);

  const reversed = expectError(
    await client.post('/positions.php', {
      nama: `Gaji Terbalik ${uniqueSuffix()}`,
      level: 'Staff',
      gajiMin: 10_000_000,
      gajiMax: 5_000_000,
    }),
    422
  );
  assert.ok(reversed.errors.gajiMax);

  assert.ok(created, 'tes create harus berhasil lebih dulu');

  const duplicate = expectError(
    await client.post('/positions.php', {
      nama: created.nama,
      kode: created.kode,
      level: 'Senior',
    }),
    422
  );
  assert.ok(duplicate.errors.nama);
  assert.ok(duplicate.errors.kode);
});

test('PUT mengubah sebagian data jabatan', async () => {
  assert.ok(created, 'tes create harus berhasil lebih dulu');

  const updated = expectSuccess(
    await client.put(`/positions.php?id=${created.id}`, { gajiMax: 15_000_000 })
  );

  assert.equal(updated.gajiMax, 15_000_000);
  assert.equal(updated.gajiMin, 9_000_000);
  assert.equal(updated.nama, created.nama);
  assert.ok(updated.updated_at);
});

test('PUT/DELETE tanpa id atau id tidak dikenal memberi 400/404', async () => {
  const missingPut = expectError(await client.put('/positions.php', { level: 'Staff' }), 400);
  assert.equal(missingPut.message, 'Parameter id wajib diisi.');

  expectError(await client.put('/positions.php?id=999999', { level: 'Staff' }), 404);

  const missingDelete = expectError(await client.del('/positions.php'), 400);
  assert.equal(missingDelete.message, 'Parameter id wajib diisi.');

  expectError(await client.del('/positions.php?id=999999'), 404);
});

test('menghapus jabatan membuat position_id karyawan menjadi null', async () => {
  const suffix = uniqueSuffix();

  const position = expectSuccess(
    await client.post('/positions.php', {
      nama: `Jabatan Set Null ${suffix}`,
      level: 'Staff',
    }),
    201
  );
  positionIds.push(position.id);

  const employee = expectSuccess(
    await client.post('/employees.php', {
      nama: `Karyawan Set Null ${suffix}`,
      email: `pos-null.${suffix}@company.id`,
      jabatan_id: position.id,
    }),
    201
  );
  employeeIds.push(employee.id);

  assert.equal(employee.jabatan_id, position.id);

  expectSuccess(await client.del(`/positions.php?id=${position.id}`));

  const afterDelete = expectSuccess(await client.get(`/employees.php?id=${employee.id}`));
  assert.equal(afterDelete.jabatan_id, null);
  assert.equal(afterDelete.jabatan, '-');
  assert.equal(afterDelete.nip, employee.nip);
});

test('DELETE menghapus jabatan', async () => {
  assert.ok(created, 'tes create harus berhasil lebih dulu');

  const result = expectSuccess(await client.del(`/positions.php?id=${created.id}`));
  assert.equal(result.deleted, true);

  expectError(await client.get(`/positions.php?id=${created.id}`), 404);
  expectError(await client.del(`/positions.php?id=${created.id}`), 404);
});
