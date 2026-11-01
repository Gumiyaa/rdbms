import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

import { createClient } from '../harness/client.mjs';
import {
  apiBaseUrl,
  cleanup,
  expectError,
  expectSuccess,
  loginOk,
} from '../harness/util.mjs';

const client = createClient(apiBaseUrl());
const createdIds = [];

let adminId;
let budi;
let phpToday;
let originalToday = null;
let todayBlanked = false;

before(async () => {
  const session = await loginOk(client);
  adminId = session.user.employee_id;

  const budiList = expectSuccess(await client.get('/employees.php?q=HR-2023001'));
  budi = budiList[0];
  assert.ok(budi, 'data seed Budi Santoso harus ada');

  const dashboard = expectSuccess(await client.get('/dashboard.php'));
  phpToday = dashboard.tanggal;
  assert.match(phpToday, /^\d{4}-\d{2}-\d{2}$/);
});

after(async () => {
  if (todayBlanked && originalToday !== null) {
    await client.put(`/attendances.php?id=${originalToday.id}`, {
      employee_id: adminId,
      tanggal: phpToday,
      masuk: originalToday.check_in ?? '',
      keluar: originalToday.check_out ?? '',
      status: originalToday.status,
      lokasi: originalToday.lokasi === '-' ? '' : originalToday.lokasi,
      notes: originalToday.notes ?? '',
    });
  }

  await cleanup(client, '/attendances.php', createdIds);
});

test('GET daftar absensi mengembalikan data + ringkasan hari ini', async () => {
  const response = await client.get('/attendances.php');
  const data = expectSuccess(response);

  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 1);
  assert.equal(response.body.meta.total, data.length);

  const summary = response.body.meta.summary;
  assert.equal(summary.tanggal, phpToday);
  assert.equal(typeof summary.tepat_waktu, 'number');
  assert.equal(typeof summary.terlambat, 'number');
  assert.equal(typeof summary.izin, 'number');
  assert.equal(typeof summary.sakit, 'number');
  assert.equal(typeof summary.alpa, 'number');
  assert.equal(
    summary.total,
    summary.tepat_waktu + summary.terlambat + summary.izin + summary.sakit + summary.alpa
  );

  const row = data[0];
  assert.equal(typeof row.id, 'number');
  assert.equal(typeof row.employee_id, 'number');
  assert.equal(typeof row.nip, 'string');
  assert.equal(typeof row.tanggal, 'string');
  assert.ok(['Hadir', 'Terlambat', 'Cuti / Izin', 'Sakit', 'Alpa'].includes(row.status));
});

test('GET rekap absensi per karyawan', async () => {
  const response = await client.get('/attendances.php?action=recap');
  const data = expectSuccess(response);

  assert.match(response.body.data.from, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(data.to, /^\d{4}-\d{2}-\d{2}$/);

  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.length >= 9);

  const admin = data.data.find((row) => row.employee_id === adminId);
  assert.ok(admin);
  assert.equal(typeof admin.hadir, 'number');
  assert.equal(typeof admin.terlambat, 'number');
  assert.equal(typeof admin.izin, 'number');
  assert.equal(typeof admin.alpa, 'number');
  assert.equal(typeof admin.total, 'number');
  assert.equal(admin.total, admin.hadir + admin.terlambat + admin.izin + admin.alpa);
});

test('GET rekap dengan rentang kosong menghasilkan nol', async () => {
  const data = expectSuccess(
    await client.get('/attendances.php?action=recap&from=2000-01-01&to=2000-01-02')
  );

  assert.equal(data.from, '2000-01-01');
  assert.equal(data.to, '2000-01-02');
  assert.ok(data.data.length >= 9);
  assert.ok(data.data.every((row) => row.total === 0));
});

test('filter employee_id, date, dan status bekerja', async () => {
  const today = expectSuccess(
    await client.get(`/attendances.php?employee_id=${adminId}&date=${phpToday}`)
  );

  assert.equal(today.length, 1);
  assert.equal(today[0].employee_id, adminId);
  assert.equal(today[0].tanggal, phpToday);

  const late = expectSuccess(await client.get('/attendances.php?status=Terlambat&limit=1000'));
  assert.ok(late.every((row) => row.status === 'Terlambat'));

  const ignoredDate = await client.get('/attendances.php?date=bukan-tanggal');
  expectSuccess(ignoredDate);
  assert.equal(ignoredDate.body.meta.summary.tanggal, phpToday);
});

test('POST membuat absensi baru', async () => {
  const response = await client.post('/attendances.php', {
    employee_id: budi.id,
    tanggal: '2001-01-02',
    masuk: '08:00',
    keluar: '17:00',
    status: 'Hadir',
    lokasi: 'Ruang Uji',
    notes: 'dibuat oleh tes otomatis',
  });

  const attendance = expectSuccess(response, 201);
  createdIds.push(attendance.id);

  assert.equal(attendance.employee_id, budi.id);
  assert.equal(attendance.tanggal, '2001-01-02');
  assert.equal(attendance.masuk, '08:00');
  assert.equal(attendance.keluar, '17:00');
  assert.equal(attendance.check_in, '08:00');
  assert.equal(attendance.check_out, '17:00');
  assert.equal(attendance.status, 'Hadir');
  assert.equal(attendance.lokasi, 'Ruang Uji');
  assert.equal(attendance.notes, 'dibuat oleh tes otomatis');
});

test('POST tanpa jam mengembalikan tanda "-" pada mapper', async () => {
  const attendance = expectSuccess(
    await client.post('/attendances.php', {
      employee_id: budi.id,
      tanggal: '2001-01-03',
      status: 'Cuti / Izin',
    }),
    201
  );

  createdIds.push(attendance.id);

  assert.equal(attendance.masuk, '-');
  assert.equal(attendance.keluar, '-');
  assert.equal(attendance.check_in, null);
  assert.equal(attendance.check_out, null);
});

test('POST menolak absensi ganda pada tanggal yang sama', async () => {
  const body = expectError(
    await client.post('/attendances.php', {
      employee_id: budi.id,
      tanggal: '2001-01-02',
      status: 'Hadir',
    }),
    422
  );

  assert.equal(body.errors.tanggal, 'Absensi karyawan pada tanggal tersebut sudah tercatat.');
});

test('POST memvalidasi karyawan, tanggal, jam, dan status', async () => {
  const empty = expectError(await client.post('/attendances.php', {}), 422);
  assert.ok(empty.errors.employee_id);
  assert.ok(empty.errors.tanggal);

  const badTime = expectError(
    await client.post('/attendances.php', {
      employee_id: budi.id,
      tanggal: '2001-01-04',
      masuk: '8:00',
    }),
    422
  );
  assert.ok(badTime.errors.masuk);

  const reversed = expectError(
    await client.post('/attendances.php', {
      employee_id: budi.id,
      tanggal: '2001-01-04',
      masuk: '09:00',
      keluar: '08:00',
    }),
    422
  );
  assert.ok(reversed.errors.keluar);

  const badStatus = expectError(
    await client.post('/attendances.php', {
      employee_id: budi.id,
      tanggal: '2001-01-04',
      status: 'Libur',
    }),
    422
  );
  assert.ok(badStatus.errors.status);
});

test('PUT mengubah absensi secara parsial', async () => {
  assert.ok(createdIds.length > 0, 'tes create harus berhasil lebih dulu');

  const updated = expectSuccess(
    await client.put(`/attendances.php?id=${createdIds[0]}`, {
      status: 'Terlambat',
      masuk: '09:00',
    })
  );

  assert.equal(updated.status, 'Terlambat');
  assert.equal(updated.masuk, '09:00');
  assert.equal(updated.keluar, '17:00');
  assert.equal(updated.lokasi, 'Ruang Uji');
});

test('PUT/DELETE tanpa id atau id tidak dikenal memberi 400/404', async () => {
  const missingPut = expectError(await client.put('/attendances.php', { status: 'Hadir' }), 400);
  assert.equal(missingPut.message, 'Parameter id wajib diisi.');

  expectError(await client.put('/attendances.php?id=999999', { status: 'Hadir' }), 404);

  const missingDelete = expectError(await client.del('/attendances.php'), 400);
  assert.equal(missingDelete.message, 'Parameter id wajib diisi.');

  expectError(await client.del('/attendances.php?id=999999'), 404);
});

test('DELETE menghapus absensi', async () => {
  assert.ok(createdIds.length > 0, 'tes create harus berhasil lebih dulu');

  const id = createdIds[0];
  const result = expectSuccess(await client.del(`/attendances.php?id=${id}`));
  assert.equal(result.deleted, true);

  const remaining = expectSuccess(
    await client.get(`/attendances.php?employee_id=${budi.id}&date=2001-01-02`)
  );
  assert.equal(remaining.length, 0);

  expectError(await client.del(`/attendances.php?id=${id}`), 404);
});

test('clock-in/out memakai sesi user dan bisa dipulihkan', async () => {
  const today = expectSuccess(
    await client.get(`/attendances.php?employee_id=${adminId}&date=${phpToday}`)
  );

  assert.equal(today.length, 1);
  originalToday = today[0];
  assert.ok(originalToday.check_in, 'seed harus mengisi jam masuk admin hari ini');

  const alreadyIn = expectError(await client.post('/attendances.php?action=clock-in', {}), 409);
  assert.match(alreadyIn.message, /sudah melakukan absen masuk/);

  const blanked = expectSuccess(
    await client.put(`/attendances.php?id=${originalToday.id}`, {
      employee_id: adminId,
      tanggal: phpToday,
      masuk: '',
      keluar: '',
      status: 'Alpa',
    })
  );
  todayBlanked = true;

  assert.equal(blanked.check_in, null);
  assert.equal(blanked.check_out, null);
  assert.equal(blanked.status, 'Alpa');

  const earlyOut = expectError(await client.post('/attendances.php?action=clock-out', {}), 400);
  assert.equal(earlyOut.message, 'Anda belum melakukan absen masuk hari ini.');

  const clockIn = expectSuccess(await client.post('/attendances.php?action=clock-in', {}), 201);
  assert.match(clockIn.check_in, /^\d{2}:\d{2}$/);
  assert.equal(clockIn.tanggal, phpToday);
  assert.ok(['Hadir', 'Terlambat'].includes(clockIn.status));
  assert.match(clockIn.lokasi, /Presensi Web/);

  const duplicateIn = expectError(
    await client.post('/attendances.php?action=clock-in', {}),
    409
  );
  assert.match(duplicateIn.message, /sudah melakukan absen masuk/);

  const clockOut = expectSuccess(await client.post('/attendances.php?action=clock-out', {}));
  assert.match(clockOut.check_out, /^\d{2}:\d{2}$/);

  const restored = expectSuccess(
    await client.put(`/attendances.php?id=${originalToday.id}`, {
      employee_id: adminId,
      tanggal: phpToday,
      masuk: originalToday.check_in ?? '',
      keluar: originalToday.check_out ?? '',
      status: originalToday.status,
      lokasi: originalToday.lokasi === '-' ? '' : originalToday.lokasi,
      notes: originalToday.notes ?? '',
    })
  );
  todayBlanked = false;

  assert.equal(restored.check_in, originalToday.check_in);
  assert.equal(restored.check_out, originalToday.check_out);
  assert.equal(restored.status, originalToday.status);
});
