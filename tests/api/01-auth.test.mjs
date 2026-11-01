import test, { before } from 'node:test';
import assert from 'node:assert/strict';

import { createClient } from '../harness/client.mjs';
import { apiBaseUrl, expectError, expectSuccess, loginOk } from '../harness/util.mjs';

const baseUrl = apiBaseUrl();
const guest = createClient(baseUrl);
const auth = createClient(baseUrl);

let session;

before(async () => {
  session = await loginOk(auth);
});

test('GET me tanpa sesi ditolak 401', async () => {
  const response = await guest.get('/auth.php?action=me');
  const body = expectError(response, 401);

  assert.equal(body.message, 'Belum login.');
});

test('login memvalidasi email dan password kosong', async () => {
  const body = expectError(await guest.post('/auth.php?action=login', {}), 422);

  assert.equal(body.message, 'Validasi gagal.');
  assert.equal(body.errors.email, 'Email tidak valid.');
  assert.equal(body.errors.password, 'Kata sandi wajib diisi.');
});

test('login menolak format email yang tidak valid', async () => {
  const body = expectError(
    await guest.post('/auth.php?action=login', { email: 'bukan-email', password: 'rahasia' }),
    422
  );

  assert.ok(body.errors.email);
  assert.equal(body.errors.password, undefined);
});

test('login menolak password salah', async () => {
  const body = expectError(
    await guest.post('/auth.php?action=login', {
      email: 'admin.hr@company.id',
      password: 'password-salah',
    }),
    401
  );

  assert.equal(body.message, 'Email atau kata sandi salah.');
});

test('login berhasil mengembalikan profil, absensi hari ini, dan cookie sesi', async () => {
  const client = createClient(baseUrl);
  const response = await client.login();
  const data = expectSuccess(response);

  assert.equal(data.user.email, 'admin.hr@company.id');
  assert.equal(data.user.nip, 'HR-2023002');
  assert.equal(typeof data.user.employee_id, 'number');
  assert.equal(data.user.role, 'HR Manager');

  assert.ok(data.today_attendance, 'seed harus menyiapkan absensi hari ini untuk admin');
  assert.match(data.today_attendance.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(typeof data.today_attendance.id, 'number');

  assert.ok(client.cookies.size > 0, 'cookie sesi PHP harus tersimpan di client');
});

test('GET me dengan sesi mengembalikan user yang sama', async () => {
  const data = expectSuccess(await auth.get('/auth.php?action=me'));

  assert.equal(data.user.id, session.user.id);
  assert.equal(data.user.email, session.user.email);
  assert.ok(data.today_attendance);
});

test('email login tidak peka huruf besar/kecil', async () => {
  const client = createClient(baseUrl);
  const data = expectSuccess(await client.login('ADMIN.HR@COMPANY.ID', 'admin123'));

  assert.equal(data.user.email, 'admin.hr@company.id');
});

test('logout menghapus sesi', async () => {
  const client = createClient(baseUrl);
  await loginOk(client);

  const logout = expectSuccess(await client.post('/auth.php?action=logout', {}));
  assert.equal(logout.logged_out, true);

  expectError(await client.get('/auth.php?action=me'), 401);
});

test('aksi autentikasi yang tidak dikenal menghasilkan 404', async () => {
  expectError(await guest.get('/auth.php?action=tidak-ada'), 404);
  expectError(await guest.post('/auth.php?action=tidak-ada', {}), 404);
});

test('metode yang tidak didukung menghasilkan 405 + header Allow', async () => {
  const response = await auth.request('PUT', '/auth.php');
  expectError(response, 405);

  assert.equal(response.headers.allow, 'GET, POST');
});

test('CORS hanya mengizinkan origin lokal', async () => {
  const allowed = await guest.request('OPTIONS', '/employees.php', {
    headers: { Origin: 'http://localhost:5173' },
  });

  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.equal(allowed.headers['access-control-allow-credentials'], 'true');

  const blocked = await guest.request('OPTIONS', '/employees.php', {
    headers: { Origin: 'https://evil.example' },
  });

  assert.equal(blocked.status, 204);
  assert.equal(blocked.headers['access-control-allow-origin'], undefined);
});

test('respons API memakai header keamanan dasar', async () => {
  const response = await auth.get('/auth.php?action=me');

  assert.match(response.headers['content-type'], /^application\/json/);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.match(response.headers['cache-control'], /(^|,\s*)no-store(,|$)/);
});
