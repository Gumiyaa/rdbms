<?php

/**
 * Endpoint dashboard (statistik & grafik).
 *
 * GET /api/dashboard.php
 */

require_once __DIR__ . '/helpers.php';

require_auth();
require_method(['GET']);

$pdo = db();
$today = today();

$totalKaryawan   = (int) $pdo->query('SELECT COUNT(*) FROM employees')->fetchColumn();
$totalDepartemen = (int) $pdo->query('SELECT COUNT(*) FROM departments')->fetchColumn();
$totalJabatan    = (int) $pdo->query('SELECT COUNT(*) FROM positions')->fetchColumn();
$karyawanAktif   = (int) $pdo->query("SELECT COUNT(*) FROM employees WHERE status = 'Aktif'")->fetchColumn();
$karyawanCuti    = (int) $pdo->query("SELECT COUNT(*) FROM employees WHERE status = 'Cuti'")->fetchColumn();
$cutiPending     = (int) $pdo->query("SELECT COUNT(*) FROM leave_requests WHERE status = 'pending'")->fetchColumn();

// ------------------------------------------------------- statistik hari ini
$stmt = $pdo->prepare('SELECT status, COUNT(*) AS total FROM attendances WHERE date = ? GROUP BY status');
$stmt->execute([$today]);

$statusCounts = [
    'Hadir'       => 0,
    'Terlambat'   => 0,
    'Cuti / Izin' => 0,
    'Sakit'       => 0,
    'Alpa'        => 0,
];

foreach ($stmt->fetchAll() as $row) {
    $statusCounts[$row['status']] = (int) $row['total'];
}

$totalHariIni = array_sum($statusCounts);
$tepatWaktu = $statusCounts['Hadir'] + $statusCounts['Terlambat'];
$persenKehadiran = $totalHariIni > 0 ? round(($tepatWaktu / $totalHariIni) * 100, 1) : 0.0;

// -------------------------------------------------- grafik kehadiran mingguan
$chartDates = last_workdays(5);

$placeholders = implode(',', array_fill(0, count($chartDates), '?'));
$stmt = $pdo->prepare(
    "SELECT date, status, COUNT(*) AS total
     FROM attendances
     WHERE date IN ({$placeholders})
     GROUP BY date, status"
);
$stmt->execute($chartDates);

$byDate = [];
foreach ($stmt->fetchAll() as $row) {
    $byDate[$row['date']][$row['status']] = (int) $row['total'];
}

$dayNames = [1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu', 7 => 'Minggu'];
$grafikMingguan = [];

foreach ($chartDates as $date) {
    $counts = $byDate[$date] ?? [];

    $grafikMingguan[] = [
        'day'       => $dayNames[(int) date('N', strtotime($date))],
        'tanggal'   => $date,
        'hadir'     => $counts['Hadir'] ?? 0,
        'terlambat' => $counts['Terlambat'] ?? 0,
        'izin'      => ($counts['Cuti / Izin'] ?? 0) + ($counts['Sakit'] ?? 0),
    ];
}

// ------------------------------------------------- distribusi per departemen
$colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e', '#0ea5e9', '#a855f7'];

$stmt = $pdo->query(
    'SELECT d.id, d.name, COUNT(e.id) AS total
     FROM departments d
     LEFT JOIN employees e ON e.department_id = d.id
     GROUP BY d.id
     ORDER BY d.id ASC'
);

$distribusi = [];
foreach ($stmt->fetchAll() as $index => $row) {
    $distribusi[] = [
        'id'    => (int) $row['id'],
        'name'  => $row['name'],
        'value' => (int) $row['total'],
        'color' => $colors[$index % count($colors)],
    ];
}

// ------------------------------------------------------ aktivitas terkini
$activitySql = 'SELECT a.*, e.nip, e.name AS employee_name, d.name AS department_name
                FROM attendances a
                JOIN employees e ON e.id = a.employee_id
                LEFT JOIN departments d ON d.id = e.department_id
                WHERE a.date = ?
                ORDER BY (a.check_in IS NULL), a.check_in DESC, a.id DESC
                LIMIT 5';

$stmt = $pdo->prepare($activitySql);
$stmt->execute([$today]);
$activityRows = $stmt->fetchAll();

if ($activityRows === []) {
    $stmt = $pdo->query(
        'SELECT a.*, e.nip, e.name AS employee_name, d.name AS department_name
         FROM attendances a
         JOIN employees e ON e.id = a.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         ORDER BY a.date DESC, (a.check_in IS NULL), a.check_in DESC
         LIMIT 5'
    );
    $activityRows = $stmt->fetchAll();
}

json_success([
    'total_karyawan'      => $totalKaryawan,
    'total_departemen'    => $totalDepartemen,
    'total_jabatan'       => $totalJabatan,
    'total_staff'         => $totalKaryawan,
    'karyawan_aktif'      => $karyawanAktif,
    'karyawan_cuti'       => $karyawanCuti,
    'cuti_pending'        => $cutiPending,
    'tanggal'             => $today,
    'kehadiran_hari_ini'  => [
        'persen'     => $persenKehadiran,
        'tepat_waktu' => $statusCounts['Hadir'],
        'terlambat'  => $statusCounts['Terlambat'],
        'total'      => $totalHariIni,
    ],
    'hari_ini'            => [
        'hadir'     => $statusCounts['Hadir'],
        'terlambat' => $statusCounts['Terlambat'],
        'izin'      => $statusCounts['Cuti / Izin'],
        'sakit'     => $statusCounts['Sakit'],
        'alpa'      => $statusCounts['Alpa'],
        'total'     => $totalHariIni,
    ],
    'grafik_mingguan'     => $grafikMingguan,
    'distribusi_departemen' => $distribusi,
    'aktivitas_terkini'   => array_map('map_attendance', $activityRows),
]);
