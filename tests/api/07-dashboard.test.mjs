import test, { before } from 'node:test';
import assert from 'node:assert/strict';

import { createClient } from '../harness/client.mjs';
import { apiBaseUrl, expectError, expectSuccess, loginOk } from '../harness/util.mjs';

const client = createClient(apiBaseUrl());
const guest = createClient(apiBaseUrl());

before(async () => {
  await loginOk(client);
});

test('GET dashboard mengembalikan statistik dan grafik yang konsisten', async () => {
  const data = expectSuccess(await client.get('/dashboard.php'));

  const employees = expectSuccess(await client.get('/employees.php'));
  const departments = expectSuccess(await client.get('/departments.php'));
  const positions = expectSuccess(await client.get('/positions.php'));

  assert.equal(data.total_karyawan, employees.length);
  assert.equal(data.total_departemen, departments.length);
  assert.equal(data.total_jabatan, positions.length);
  assert.equal(data.total_staff, data.total_karyawan);
  assert.ok(data.karyawan_aktif >= 1);
  assert.ok(data.cuti_pending >= 1);
  assert.match(data.tanggal, /^\d{4}-\d{2}-\d{2}$/);

  const today = data.hari_ini;
  assert.equal(typeof today.hadir, 'number');
  assert.equal(typeof today.terlambat, 'number');
  assert.equal(typeof today.izin, 'number');
  assert.equal(typeof today.sakit, 'number');
  assert.equal(typeof today.alpa, 'number');
  assert.equal(
    today.total,
    today.hadir + today.terlambat + today.izin + today.sakit + today.alpa
  );

  const presence = data.kehadiran_hari_ini;
  assert.equal(presence.total, today.total);
  assert.equal(presence.tepat_waktu, today.hadir);
  assert.equal(presence.terlambat, today.terlambat);
  assert.equal(typeof presence.persen, 'number');
  assert.ok(presence.persen >= 0 && presence.persen <= 100);

  const expectedPercent =
    presence.total > 0
      ? Math.round(((today.hadir + today.terlambat) / presence.total) * 1000) / 10
      : 0;
  assert.ok(Math.abs(presence.persen - expectedPercent) <= 0.1);
});

test('grafik mingguan berisi 5 hari kerja terakhir', async () => {
  const data = expectSuccess(await client.get('/dashboard.php'));
  const chart = data.grafik_mingguan;

  assert.equal(chart.length, 5);

  const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  for (const point of chart) {
    assert.ok(dayNames.includes(point.day));
    assert.match(point.tanggal, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(typeof point.hadir, 'number');
    assert.equal(typeof point.terlambat, 'number');
    assert.equal(typeof point.izin, 'number');
  }

  assert.ok(chart[4].tanggal <= data.tanggal);

  const weekday = new Date(`${data.tanggal}T00:00:00`).getDay();
  if (weekday >= 1 && weekday <= 5) {
    assert.equal(chart[4].tanggal, data.tanggal);
  }
});

test('distribusi departemen dan aktivitas terkini terbentuk', async () => {
  const data = expectSuccess(await client.get('/dashboard.php'));

  assert.ok(Array.isArray(data.distribusi_departemen));
  assert.ok(data.distribusi_departemen.length >= 6);

  let members = 0;
  for (const item of data.distribusi_departemen) {
    assert.equal(typeof item.id, 'number');
    assert.equal(typeof item.name, 'string');
    assert.equal(typeof item.value, 'number');
    assert.match(item.color, /^#[0-9a-f]{6}$/i);
    members += item.value;
  }
  assert.ok(members >= 1);

  assert.ok(Array.isArray(data.aktivitas_terkini));
  assert.ok(data.aktivitas_terkini.length >= 1);
  assert.ok(data.aktivitas_terkini.length <= 5);

  const activity = data.aktivitas_terkini[0];
  assert.equal(typeof activity.id, 'number');
  assert.equal(typeof activity.employee_id, 'number');
  assert.equal(typeof activity.nama, 'string');
});

test('dashboard menolak request tanpa sesi dan metode selain GET', async () => {
  expectError(await guest.get('/dashboard.php'), 401);
  expectError(await client.post('/dashboard.php', {}), 405);
});
