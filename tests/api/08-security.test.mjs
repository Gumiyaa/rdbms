import test, { before } from 'node:test';
import assert from 'node:assert/strict';

import { createClient } from '../harness/client.mjs';
import { apiBaseUrl, expectError, expectSuccess, loginOk } from '../harness/util.mjs';

const client = createClient(apiBaseUrl());
const guest = createClient(apiBaseUrl());

const protectedPaths = [
  '/employees.php',
  '/departments.php',
  '/positions.php',
  '/attendances.php',
  '/leave_requests.php',
  '/dashboard.php',
];

before(async () => {
  await loginOk(client);
});

test('semua endpoint terproteksi menolak request tanpa sesi', async () => {
  for (const path of protectedPaths) {
    const body = expectError(await guest.get(path), 401);
    assert.equal(body.message, 'Sesi tidak valid. Silakan login kembali.');
  }

  expectError(
    await guest.post('/employees.php', {
      nama: 'Tanpa Sesi',
      email: 'tanpa.sesi@company.id',
    }),
    401
  );
});

test('body JSON yang tidak valid ditolak 400', async () => {
  const broken = await client.post('/employees.php', undefined, { rawBody: '{ "nama": ' });
  const body = expectError(broken, 400);

  assert.equal(body.message, 'Body request harus berupa JSON yang valid.');

  const scalar = await client.post('/employees.php', undefined, { rawBody: '"teks"' });
  expectError(scalar, 400);
});

test('input pencarian tidak bisa dipakai untuk SQL injection', async () => {
  const injectedQuery = await client.get(
    `/employees.php?q=${encodeURIComponent("' OR 1=1 --")}`
  );
  const rows = expectSuccess(injectedQuery);

  assert.ok(Array.isArray(rows));
  assert.equal(rows.length, 0);

  const injectedId = await client.get(`/employees.php?id=${encodeURIComponent('1 OR 1=1')}`);
  const list = expectSuccess(injectedId);

  assert.ok(Array.isArray(list));
  assert.ok(list.length >= 9);
});

test('error database tidak membocorkan detail internal', async () => {
  const body = expectError(await client.get('/employees.php?id=999999'), 404);
  const serialized = JSON.stringify(body);

  assert.doesNotMatch(serialized, /SQLSTATE|PDOException|SQLite3|\.php:\d+/);
});

test('metode HTTP yang tidak didukung menghasilkan 405', async () => {
  expectError(await client.post('/dashboard.php', {}), 405);

  const authPut = await client.request('PUT', '/auth.php');
  expectError(authPut, 405);
  assert.equal(authPut.headers.allow, 'GET, POST');

  const head = await client.request('HEAD', '/employees.php');
  assert.equal(head.status, 405);
  assert.equal(head.headers.allow, 'GET, POST, PUT, DELETE');
});

test('logout membuat cookie sesi lama tidak berlaku lagi', async () => {
  const scoped = createClient(apiBaseUrl());

  await loginOk(scoped);
  expectSuccess(await scoped.post('/auth.php?action=logout', {}));
  expectError(await scoped.get('/auth.php?action=me'), 401);
  expectError(await scoped.get('/dashboard.php'), 401);
});
