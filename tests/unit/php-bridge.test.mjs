import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { resolvePhpBinary } from '../harness/php.mjs';

const callScript = fileURLToPath(new URL('./call.php', import.meta.url));
let phpBinary;

before(() => {
  phpBinary = resolvePhpBinary();
});

function call(fn, ...args) {
  const result = spawnSync(phpBinary, [callScript], {
    input: JSON.stringify({ fn, args }),
    encoding: 'utf8',
    timeout: 30_000,
    windowsHide: true,
  });

  assert.equal(result.status, 0, `PHP gagal: ${result.stderr || result.stdout}`);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);

  return payload.result;
}

test('format_budget memformat ribuan, juta, dan miliar', () => {
  assert.equal(call('format_budget', 0), 'Rp 0');
  assert.equal(call('format_budget', 999), 'Rp 999');
  assert.equal(call('format_budget', 1_000_000), 'Rp 1 JT');
  assert.equal(call('format_budget', 450_000_000), 'Rp 450 JT');
  assert.equal(call('format_budget', 1_250_000), 'Rp 1,3 JT');
  assert.equal(call('format_budget', 1_000_000_000), 'Rp 1 M');
  assert.equal(call('format_budget', 1_500_000_000), 'Rp 1,5 M');
});

test('parse_budget menerima angka, teks rupiah, dan satuan', () => {
  assert.equal(call('parse_budget', 750_000), 750_000);
  assert.equal(call('parse_budget', '450000000'), 450_000_000);
  assert.equal(call('parse_budget', 'Rp 450 JT'), 450_000_000);
  assert.equal(call('parse_budget', '1,5 M'), 1_500_000_000);
  assert.equal(call('parse_budget', '2.500.000'), 2_500_000);
  assert.equal(call('parse_budget', '0'), 0);
});

test('parse_budget menolak input tidak valid dan membatasi nilai negatif', () => {
  assert.equal(call('parse_budget', null), null);
  assert.equal(call('parse_budget', ''), null);
  assert.equal(call('parse_budget', 'banyak'), null);
  assert.equal(call('parse_budget', 'Rp'), null);
  assert.equal(call('parse_budget', -100), 0);
});

test('is_valid_date memakai format YYYY-MM-DD yang ketat', () => {
  assert.equal(call('is_valid_date', '2024-01-31'), true);
  assert.equal(call('is_valid_date', '2024-02-29'), true);
  assert.equal(call('is_valid_date', '2023-02-29'), false);
  assert.equal(call('is_valid_date', '2024-13-01'), false);
  assert.equal(call('is_valid_date', '2024-2-1'), false);
  assert.equal(call('is_valid_date', '01-01-2024'), false);
  assert.equal(call('is_valid_date', ''), false);
  assert.equal(call('is_valid_date', null), false);
});

test('is_valid_time menerima HH:MM 24 jam', () => {
  assert.equal(call('is_valid_time', '00:00'), true);
  assert.equal(call('is_valid_time', '08:05'), true);
  assert.equal(call('is_valid_time', '23:59'), true);
  assert.equal(call('is_valid_time', '24:00'), false);
  assert.equal(call('is_valid_time', '8:00'), false);
  assert.equal(call('is_valid_time', '08:60'), false);
  assert.equal(call('is_valid_time', ''), false);
  assert.equal(call('is_valid_time', null), false);
});

test('map_employee menormalkan field dan nilai null', () => {
  const mapped = call('map_employee', {
    id: '7',
    nip: 'HR-2023007',
    name: 'Hendra Kusuma',
    email: 'hendra.k@company.id',
    department_name: 'Keuangan & Akuntansi',
    department_id: '3',
    position_name: 'Financial Analyst',
    position_id: '4',
    status: 'Aktif',
    phone: null,
    join_date: '2018-04-18',
    avatar: '',
    created_at: '2024-01-01 00:00:00',
    updated_at: null,
  });

  assert.equal(mapped.id, 7);
  assert.equal(mapped.nama, 'Hendra Kusuma');
  assert.equal(mapped.name, 'Hendra Kusuma');
  assert.equal(mapped.departemen, 'Keuangan & Akuntansi');
  assert.equal(mapped.departemen_id, 3);
  assert.equal(mapped.jabatan_id, 4);
  assert.equal(mapped.telepon, '');
  assert.equal(mapped.joinDate, '2018-04-18');
  assert.equal(mapped.join_date, '2018-04-18');
  assert.match(mapped.avatar, /^https:\/\/images\.unsplash\.com\//);
});

test('map_department memformat anggaran dan anggota', () => {
  const mapped = call('map_department', {
    id: '1',
    code: 'DEPT-TI',
    name: 'Teknologi Informasi',
    head_name: 'Budi Santoso',
    head_id: '2',
    member_count: '5',
    location: null,
    budget: '450000000',
    created_at: '2024-01-01 00:00:00',
    updated_at: null,
  });

  assert.equal(mapped.id, 1);
  assert.equal(mapped.kode, 'DEPT-TI');
  assert.equal(mapped.kepala, 'Budi Santoso');
  assert.equal(mapped.kepala_id, 2);
  assert.equal(mapped.anggota, 5);
  assert.equal(mapped.lokasi, '-');
  assert.equal(mapped.location, '-');
  assert.equal(mapped.anggaran, 'Rp 450 JT');
  assert.equal(mapped.anggaran_nilai, 450_000_000);
  assert.equal(mapped.budget, 450_000_000);
});

test('map_position menormalkan gaji dan jumlah pemegang', () => {
  const mapped = call('map_position', {
    id: '2',
    code: 'JAB-002',
    name: 'Senior Frontend Developer',
    level: 'Senior',
    salary_min: '10000000',
    salary_max: '15000000',
    holder_count: '1',
  });

  assert.equal(mapped.id, 2);
  assert.equal(mapped.kode, 'JAB-002');
  assert.equal(mapped.level, 'Senior');
  assert.equal(mapped.gajiMin, 10_000_000);
  assert.equal(mapped.gajiMax, 15_000_000);
  assert.equal(mapped.salary_min, 10_000_000);
  assert.equal(mapped.salary_max, 15_000_000);
  assert.equal(mapped.pemegang, 1);
});

test('map_attendance memakai tanda "-" untuk nilai kosong', () => {
  const mapped = call('map_attendance', {
    id: '10',
    employee_id: '3',
    nip: 'HR-2023003',
    employee_name: 'Ahmad Hidayat',
    department_name: null,
    date: '2024-05-01',
    check_in: null,
    check_out: null,
    status: 'Cuti / Izin',
    location: null,
    notes: null,
  });

  assert.equal(mapped.id, 10);
  assert.equal(mapped.employee_id, 3);
  assert.equal(mapped.nama, 'Ahmad Hidayat');
  assert.equal(mapped.departemen, '-');
  assert.equal(mapped.tanggal, '2024-05-01');
  assert.equal(mapped.date, '2024-05-01');
  assert.equal(mapped.masuk, '-');
  assert.equal(mapped.keluar, '-');
  assert.equal(mapped.check_in, null);
  assert.equal(mapped.check_out, null);
  assert.equal(mapped.lokasi, '-');
  assert.equal(mapped.notes, null);
});

test('map_leave_request menormalkan jenis, tanggal, dan alasan', () => {
  const mapped = call('map_leave_request', {
    id: '4',
    employee_id: '5',
    nip: 'HR-2023005',
    employee_name: 'Rizky Pratama',
    department_name: null,
    type: 'Cuti Tahunan',
    start_date: '2024-06-01',
    end_date: '2024-06-03',
    reason: null,
    status: 'pending',
  });

  assert.equal(mapped.id, 4);
  assert.equal(mapped.employee_id, 5);
  assert.equal(mapped.nama, 'Rizky Pratama');
  assert.equal(mapped.departemen, '-');
  assert.equal(mapped.jenis, 'Cuti Tahunan');
  assert.equal(mapped.type, 'Cuti Tahunan');
  assert.equal(mapped.tanggal_mulai, '2024-06-01');
  assert.equal(mapped.tanggal_selesai, '2024-06-03');
  assert.equal(mapped.start_date, '2024-06-01');
  assert.equal(mapped.end_date, '2024-06-03');
  assert.equal(mapped.alasan, '');
  assert.equal(mapped.reason, '');
  assert.equal(mapped.status, 'pending');
});
