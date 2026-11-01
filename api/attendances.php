<?php

/**
 * Endpoint manajemen absensi.
 *
 * GET    /api/attendances.php                 -> daftar + ringkasan
 * GET    /api/attendances.php?action=recap    -> rekap kehadiran per karyawan
 * POST   /api/attendances.php                 -> tambah absensi
 * POST   /api/attendances.php?action=clock-in -> absen masuk (user login)
 * POST   /api/attendances.php?action=clock-out-> absen keluar (user login)
 * PUT    /api/attendances.php?id=1            -> ubah
 * DELETE /api/attendances.php?id=1            -> hapus
 *
 * Filter GET: employee_id, date, from, to, status, limit
 */

require_once __DIR__ . '/helpers.php';

$user = require_auth();

$method = require_method(['GET', 'POST', 'PUT', 'DELETE']);
$action = (string) query_param('action', '');
$pdo = db();

if ($method === 'GET') {
    if ($action === 'recap') {
        json_success(build_recap($pdo));
    }

    [$rows, $summary] = fetch_attendance_list($pdo);

    json_success($rows, [
        'total'   => count($rows),
        'summary' => $summary,
    ]);
}

if ($method === 'POST' && $action === 'clock-in') {
    clock_in($pdo, $user);
}

if ($method === 'POST' && $action === 'clock-out') {
    clock_out($pdo, $user);
}

switch ($method) {
    case 'POST':
        create_attendance($pdo, request_body());

    case 'PUT':
        $id = query_int('id');

        if ($id === null) {
            json_error('Parameter id wajib diisi.', 400);
        }

        update_attendance($pdo, $id, request_body());

    case 'DELETE':
        delete_attendance($pdo, query_int('id'));
}

json_error('Metode tidak didukung.', 405);

// ---------------------------------------------------------------------------

function attendance_filters(): array
{
    $where = [];
    $params = [];

    $employeeId = query_int('employee_id');
    if ($employeeId !== null) {
        $where[] = 'a.employee_id = ?';
        $params[] = $employeeId;
    }

    $date = query_param('date');
    if (is_string($date) && is_valid_date($date)) {
        $where[] = 'a.date = ?';
        $params[] = $date;
    }

    $from = query_param('from');
    if (is_string($from) && is_valid_date($from)) {
        $where[] = 'a.date >= ?';
        $params[] = $from;
    }

    $to = query_param('to');
    if (is_string($to) && is_valid_date($to)) {
        $where[] = 'a.date <= ?';
        $params[] = $to;
    }

    $status = trim((string) query_param('status', ''));
    if ($status !== '' && $status !== 'Semua') {
        $where[] = 'a.status = ?';
        $params[] = $status;
    }

    return [$where, $params];
}

function fetch_attendance_list(PDO $pdo): array
{
    [$where, $params] = attendance_filters();

    $limit = query_int('limit') ?? 200;
    $limit = max(1, min($limit, 1000));

    $sql = 'SELECT a.*, e.nip, e.name AS employee_name, d.name AS department_name
            FROM attendances a
            JOIN employees e ON e.id = a.employee_id
            LEFT JOIN departments d ON d.id = e.department_id';

    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY a.date DESC, a.id DESC LIMIT ' . $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $rows = array_map('map_attendance', $stmt->fetchAll());

    // Ringkasan dihitung untuk tanggal hari ini (atau tanggal filter).
    $summaryDate = is_string(query_param('date')) && is_valid_date((string) query_param('date'))
        ? (string) query_param('date')
        : today();

    return [$rows, build_summary($pdo, $summaryDate)];
}

function build_summary(PDO $pdo, string $date): array
{
    $stmt = $pdo->prepare('SELECT status, COUNT(*) AS total FROM attendances WHERE date = ? GROUP BY status');
    $stmt->execute([$date]);

    $counts = [
        'Hadir'       => 0,
        'Terlambat'   => 0,
        'Cuti / Izin' => 0,
        'Sakit'       => 0,
        'Alpa'        => 0,
    ];

    foreach ($stmt->fetchAll() as $row) {
        $counts[$row['status']] = (int) $row['total'];
    }

    return [
        'tanggal'     => $date,
        'tepat_waktu' => $counts['Hadir'],
        'terlambat'   => $counts['Terlambat'],
        'izin'        => $counts['Cuti / Izin'],
        'sakit'       => $counts['Sakit'],
        'alpa'        => $counts['Alpa'],
        'total'       => array_sum($counts),
    ];
}

function build_recap(PDO $pdo): array
{
    $from = query_param('from');
    $to = query_param('to');

    $from = is_string($from) && is_valid_date($from) ? $from : date('Y-m-01');
    $to = is_string($to) && is_valid_date($to) ? $to : date('Y-m-t');

    $stmt = $pdo->prepare(
        "SELECT e.id, e.nip, e.name, d.name AS department_name,
                SUM(CASE WHEN a.status = 'Hadir' THEN 1 ELSE 0 END)       AS hadir,
                SUM(CASE WHEN a.status = 'Terlambat' THEN 1 ELSE 0 END)   AS terlambat,
                SUM(CASE WHEN a.status IN ('Cuti / Izin', 'Sakit') THEN 1 ELSE 0 END) AS izin,
                SUM(CASE WHEN a.status = 'Alpa' THEN 1 ELSE 0 END)        AS alpa,
                COUNT(a.id) AS total
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN attendances a ON a.employee_id = e.id AND a.date BETWEEN ? AND ?
         GROUP BY e.id
         ORDER BY e.name ASC"
    );
    $stmt->execute([$from, $to]);

    $rows = array_map(static fn (array $row): array => [
        'employee_id' => (int) $row['id'],
        'nip'         => $row['nip'],
        'nama'        => $row['name'],
        'departemen'  => $row['department_name'] ?? '-',
        'hadir'       => (int) $row['hadir'],
        'terlambat'   => (int) $row['terlambat'],
        'izin'        => (int) $row['izin'],
        'alpa'        => (int) $row['alpa'],
        'total'       => (int) $row['total'],
    ], $stmt->fetchAll());

    return [
        'from' => $from,
        'to'   => $to,
        'data' => $rows,
    ];
}

function create_attendance(PDO $pdo, array $body): never
{
    $data = validate_attendance($pdo, $body, null);

    $stmt = $pdo->prepare(
        'INSERT INTO attendances (employee_id, date, check_in, check_out, status, location, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    try {
        $stmt->execute([
            $data['employee_id'],
            $data['date'],
            $data['check_in'],
            $data['check_out'],
            $data['status'],
            $data['location'],
            $data['notes'],
        ]);
    } catch (PDOException $e) {
        handle_db_exception($e, 'Gagal menambahkan absensi.');
    }

    json_success(fetch_attendance($pdo, (int) $pdo->lastInsertId()), [], 201);
}

function update_attendance(PDO $pdo, int $id, array $body): never
{
    $existing = $pdo->prepare('SELECT * FROM attendances WHERE id = ?');
    $existing->execute([$id]);
    $row = $existing->fetch();

    if (!$row) {
        json_error('Data absensi tidak ditemukan.', 404);
    }

    $merged = [
        'employee_id' => $row['employee_id'],
        'tanggal'     => $row['date'],
        'masuk'       => $row['check_in'],
        'keluar'      => $row['check_out'],
        'status'      => $row['status'],
        'lokasi'      => $row['location'],
        'notes'       => $row['notes'],
    ];

    $aliases = [
        'employee_id' => ['employee_id', 'karyawan_id'],
        'tanggal'     => ['tanggal', 'date'],
        'masuk'       => ['masuk', 'check_in'],
        'keluar'      => ['keluar', 'check_out'],
        'status'      => ['status'],
        'lokasi'      => ['lokasi', 'location'],
        'notes'       => ['notes', 'keterangan'],
    ];

    foreach ($aliases as $canonical => $keys) {
        foreach ($keys as $key) {
            if (array_key_exists($key, $body)) {
                $merged[$canonical] = $body[$key];
                break;
            }
        }
    }

    $data = validate_attendance($pdo, $merged, $id);

    $stmt = $pdo->prepare(
        'UPDATE attendances
         SET employee_id = ?, date = ?, check_in = ?, check_out = ?, status = ?,
             location = ?, notes = ?, updated_at = datetime(\'now\')
         WHERE id = ?'
    );

    try {
        $stmt->execute([
            $data['employee_id'],
            $data['date'],
            $data['check_in'],
            $data['check_out'],
            $data['status'],
            $data['location'],
            $data['notes'],
            $id,
        ]);
    } catch (PDOException $e) {
        handle_db_exception($e, 'Gagal mengubah absensi.');
    }

    json_success(fetch_attendance($pdo, $id));
}

function delete_attendance(PDO $pdo, ?int $id): never
{
    if ($id === null) {
        json_error('Parameter id wajib diisi.', 400);
    }

    $exists = $pdo->prepare('SELECT 1 FROM attendances WHERE id = ?');
    $exists->execute([$id]);

    if (!$exists->fetchColumn()) {
        json_error('Data absensi tidak ditemukan.', 404);
    }

    $pdo->prepare('DELETE FROM attendances WHERE id = ?')->execute([$id]);

    json_success(['id' => $id, 'deleted' => true]);
}

function fetch_attendance(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT a.*, e.nip, e.name AS employee_name, d.name AS department_name
         FROM attendances a
         JOIN employees e ON e.id = a.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE a.id = ?'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    return $row ? map_attendance($row) : null;
}

/**
 * @return array{employee_id: int, date: string, check_in: ?string, check_out: ?string,
 *               status: string, location: ?string, notes: ?string}
 */
function validate_attendance(PDO $pdo, array $body, ?int $ignoreId): array
{
    $errors = [];

    $employeeId = body_int(pick($body, ['employee_id', 'karyawan_id']));
    $date = trim((string) pick($body, ['tanggal', 'date'], ''));
    $checkIn = trim((string) pick($body, ['masuk', 'check_in'], ''));
    $checkOut = trim((string) pick($body, ['keluar', 'check_out'], ''));
    $status = trim((string) pick($body, ['status'], 'Hadir'));
    $location = trim((string) pick($body, ['lokasi', 'location'], ''));
    $notes = trim((string) pick($body, ['notes', 'keterangan'], ''));

    $statuses = ['Hadir', 'Terlambat', 'Cuti / Izin', 'Sakit', 'Alpa'];

    if ($employeeId === null) {
        $errors['employee_id'] = 'Karyawan wajib dipilih.';
    } else {
        $check = $pdo->prepare('SELECT 1 FROM employees WHERE id = ?');
        $check->execute([$employeeId]);

        if (!$check->fetchColumn()) {
            $errors['employee_id'] = 'Karyawan tidak ditemukan.';
        }
    }

    if ($date === '' || !is_valid_date($date)) {
        $errors['tanggal'] = 'Tanggal harus berformat YYYY-MM-DD.';
    }

    if ($checkIn !== '' && !is_valid_time($checkIn)) {
        $errors['masuk'] = 'Jam masuk harus berformat HH:MM.';
    }

    if ($checkOut !== '' && !is_valid_time($checkOut)) {
        $errors['keluar'] = 'Jam keluar harus berformat HH:MM.';
    }

    if ($checkIn !== '' && $checkOut !== '' && strtotime($checkOut) < strtotime($checkIn)) {
        $errors['keluar'] = 'Jam keluar tidak boleh lebih awal dari jam masuk.';
    }

    if (!in_array($status, $statuses, true)) {
        $errors['status'] = 'Status harus salah satu dari: ' . implode(', ', $statuses) . '.';
    }

    if ($location !== '' && mb_strlen($location) > 150) {
        $errors['lokasi'] = 'Lokasi maksimal 150 karakter.';
    }

    if ($notes !== '' && mb_strlen($notes) > 255) {
        $errors['notes'] = 'Keterangan maksimal 255 karakter.';
    }

    if ($errors === [] && $employeeId !== null && $date !== '') {
        $dupe = $pdo->prepare('SELECT id FROM attendances WHERE employee_id = ? AND date = ? AND id != ?');
        $dupe->execute([$employeeId, $date, $ignoreId ?? 0]);

        if ($dupe->fetchColumn()) {
            $errors['tanggal'] = 'Absensi karyawan pada tanggal tersebut sudah tercatat.';
        }
    }

    if ($errors !== []) {
        json_error('Validasi gagal.', 422, $errors);
    }

    return [
        'employee_id' => $employeeId,
        'date'        => $date,
        'check_in'    => $checkIn !== '' ? $checkIn : null,
        'check_out'   => $checkOut !== '' ? $checkOut : null,
        'status'      => $status,
        'location'    => $location !== '' ? $location : null,
        'notes'       => $notes !== '' ? $notes : null,
    ];
}

function clock_in(PDO $pdo, array $user): never
{
    if ($user['employee_id'] === null) {
        json_error('Akun Anda belum terhubung dengan data karyawan.', 400);
    }

    $employeeId = (int) $user['employee_id'];
    $date = today();

    $stmt = $pdo->prepare('SELECT * FROM attendances WHERE employee_id = ? AND date = ?');
    $stmt->execute([$employeeId, $date]);
    $existing = $stmt->fetch();

    if ($existing && $existing['check_in'] !== null) {
        json_error('Anda sudah melakukan absen masuk hari ini pada pukul ' . $existing['check_in'] . '.', 409);
    }

    $time = date('H:i');
    $status = $time > '08:00' ? 'Terlambat' : 'Hadir';
    $location = 'Kantor Utama (Presensi Web)';

    if ($existing) {
        $pdo->prepare('UPDATE attendances SET check_in = ?, status = ?, location = ?, updated_at = datetime(\'now\') WHERE id = ?')
            ->execute([$time, $status, $location, (int) $existing['id']]);

        $id = (int) $existing['id'];
    } else {
        $pdo->prepare(
            'INSERT INTO attendances (employee_id, date, check_in, status, location) VALUES (?, ?, ?, ?, ?)'
        )->execute([$employeeId, $date, $time, $status, $location]);

        $id = (int) $pdo->lastInsertId();
    }

    json_success(fetch_attendance($pdo, $id), [], 201);
}

function clock_out(PDO $pdo, array $user): never
{
    if ($user['employee_id'] === null) {
        json_error('Akun Anda belum terhubung dengan data karyawan.', 400);
    }

    $employeeId = (int) $user['employee_id'];
    $date = today();

    $stmt = $pdo->prepare('SELECT * FROM attendances WHERE employee_id = ? AND date = ?');
    $stmt->execute([$employeeId, $date]);
    $existing = $stmt->fetch();

    if (!$existing || $existing['check_in'] === null) {
        json_error('Anda belum melakukan absen masuk hari ini.', 400);
    }

    $time = date('H:i');
    $pdo->prepare('UPDATE attendances SET check_out = ?, updated_at = datetime(\'now\') WHERE id = ?')
        ->execute([$time, (int) $existing['id']]);

    json_success(fetch_attendance($pdo, (int) $existing['id']));
}
