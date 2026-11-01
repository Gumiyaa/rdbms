<?php

/**
 * Endpoint pengajuan cuti / izin.
 *
 * GET    /api/leave_requests.php              -> daftar (status, employee_id)
 * GET    /api/leave_requests.php?id=1         -> detail
 * POST   /api/leave_requests.php              -> ajukan cuti
 * PUT    /api/leave_requests.php?id=1         -> ubah data / status
 * DELETE /api/leave_requests.php?id=1         -> hapus
 */

require_once __DIR__ . '/helpers.php';

$user = require_auth();

$method = require_method(['GET', 'POST', 'PUT', 'DELETE']);
$pdo = db();

switch ($method) {
    case 'GET':
        $id = query_int('id');

        if ($id !== null) {
            $leave = fetch_leave_request($pdo, $id);

            if ($leave === null) {
                json_error('Pengajuan cuti tidak ditemukan.', 404);
            }

            json_success($leave);
        }

        $list = fetch_leave_request_list($pdo);

        json_success($list, ['total' => count($list)]);

    case 'POST':
        create_leave_request($pdo, request_body(), $user);

    case 'PUT':
        $id = query_int('id');

        if ($id === null) {
            json_error('Parameter id wajib diisi.', 400);
        }

        update_leave_request($pdo, $id, request_body(), $user);

    case 'DELETE':
        delete_leave_request($pdo, query_int('id'));
}

json_error('Metode tidak didukung.', 405);

// ---------------------------------------------------------------------------

function leave_request_query(): string
{
    return 'SELECT l.*, e.nip, e.name AS employee_name, d.name AS department_name
            FROM leave_requests l
            JOIN employees e ON e.id = l.employee_id
            LEFT JOIN departments d ON d.id = e.department_id';
}

function fetch_leave_request(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(leave_request_query() . ' WHERE l.id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    return $row ? map_leave_request($row) : null;
}

function fetch_leave_request_list(PDO $pdo): array
{
    $where = [];
    $params = [];

    $status = trim((string) query_param('status', ''));
    if ($status !== '' && $status !== 'Semua') {
        $where[] = 'l.status = ?';
        $params[] = $status;
    }

    $employeeId = query_int('employee_id');
    if ($employeeId !== null) {
        $where[] = 'l.employee_id = ?';
        $params[] = $employeeId;
    }

    $sql = leave_request_query();

    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY l.created_at DESC, l.id DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    return array_map('map_leave_request', $stmt->fetchAll());
}

function create_leave_request(PDO $pdo, array $body, array $user): never
{
    $data = validate_leave_request($pdo, $body, null, $user);

    $stmt = $pdo->prepare(
        'INSERT INTO leave_requests (employee_id, type, start_date, end_date, reason, status)
         VALUES (?, ?, ?, ?, ?, ?)'
    );

    try {
        $stmt->execute([
            $data['employee_id'],
            $data['type'],
            $data['start_date'],
            $data['end_date'],
            $data['reason'],
            $data['status'],
        ]);
    } catch (PDOException $e) {
        handle_db_exception($e, 'Gagal menyimpan pengajuan cuti.');
    }

    json_success(fetch_leave_request($pdo, (int) $pdo->lastInsertId()), [], 201);
}

function update_leave_request(PDO $pdo, int $id, array $body, array $user): never
{
    $existing = $pdo->prepare('SELECT * FROM leave_requests WHERE id = ?');
    $existing->execute([$id]);
    $row = $existing->fetch();

    if (!$row) {
        json_error('Pengajuan cuti tidak ditemukan.', 404);
    }

    $merged = [
        'employee_id' => $row['employee_id'],
        'jenis'       => $row['type'],
        'mulai'       => $row['start_date'],
        'selesai'     => $row['end_date'],
        'alasan'      => $row['reason'],
        'status'      => $row['status'],
    ];

    $aliases = [
        'employee_id' => ['employee_id', 'karyawan_id'],
        'jenis'       => ['jenis', 'type'],
        'mulai'       => ['tanggal_mulai', 'start_date', 'mulai'],
        'selesai'     => ['tanggal_selesai', 'end_date', 'selesai'],
        'alasan'      => ['alasan', 'reason'],
        'status'      => ['status'],
    ];

    foreach ($aliases as $canonical => $keys) {
        foreach ($keys as $key) {
            if (array_key_exists($key, $body)) {
                $merged[$canonical] = $body[$key];
                break;
            }
        }
    }

    $data = validate_leave_request($pdo, $merged, $id, $user);

    $statusChanged = $data['status'] !== $row['status'];

    $stmt = $pdo->prepare(
        'UPDATE leave_requests
         SET employee_id = ?, type = ?, start_date = ?, end_date = ?, reason = ?, status = ?,
             reviewed_by = ?, updated_at = datetime(\'now\')
         WHERE id = ?'
    );

    try {
        $stmt->execute([
            $data['employee_id'],
            $data['type'],
            $data['start_date'],
            $data['end_date'],
            $data['reason'],
            $data['status'],
            $statusChanged ? (int) $user['id'] : $row['reviewed_by'],
            $id,
        ]);
    } catch (PDOException $e) {
        handle_db_exception($e, 'Gagal mengubah pengajuan cuti.');
    }

    json_success(fetch_leave_request($pdo, $id));
}

function delete_leave_request(PDO $pdo, ?int $id): never
{
    if ($id === null) {
        json_error('Parameter id wajib diisi.', 400);
    }

    $exists = $pdo->prepare('SELECT 1 FROM leave_requests WHERE id = ?');
    $exists->execute([$id]);

    if (!$exists->fetchColumn()) {
        json_error('Pengajuan cuti tidak ditemukan.', 404);
    }

    $pdo->prepare('DELETE FROM leave_requests WHERE id = ?')->execute([$id]);

    json_success(['id' => $id, 'deleted' => true]);
}

/**
 * @return array{employee_id: int, type: string, start_date: string, end_date: string,
 *               reason: ?string, status: string}
 */
function validate_leave_request(PDO $pdo, array $body, ?int $ignoreId, array $user): array
{
    $errors = [];

    $employeeId = body_int(pick($body, ['employee_id', 'karyawan_id'], $user['employee_id']));
    $type = trim((string) pick($body, ['jenis', 'type'], 'Cuti Tahunan'));
    $start = trim((string) pick($body, ['tanggal_mulai', 'start_date', 'mulai'], ''));
    $end = trim((string) pick($body, ['tanggal_selesai', 'end_date', 'selesai'], ''));
    $reason = trim((string) pick($body, ['alasan', 'reason'], ''));
    $status = strtolower(trim((string) pick($body, ['status'], 'pending')));

    $types = ['Cuti Tahunan', 'Sakit', 'Izin'];
    $statuses = ['pending', 'approved', 'rejected'];

    if ($employeeId === null) {
        $errors['employee_id'] = 'Karyawan wajib dipilih.';
    } else {
        $check = $pdo->prepare('SELECT 1 FROM employees WHERE id = ?');
        $check->execute([$employeeId]);

        if (!$check->fetchColumn()) {
            $errors['employee_id'] = 'Karyawan tidak ditemukan.';
        }
    }

    if (!in_array($type, $types, true)) {
        $errors['jenis'] = 'Jenis harus salah satu dari: ' . implode(', ', $types) . '.';
    }

    if ($start === '' || !is_valid_date($start)) {
        $errors['tanggal_mulai'] = 'Tanggal mulai harus berformat YYYY-MM-DD.';
    }

    if ($end === '' || !is_valid_date($end)) {
        $errors['tanggal_selesai'] = 'Tanggal selesai harus berformat YYYY-MM-DD.';
    }

    if (is_valid_date($start) && is_valid_date($end) && strtotime($end) < strtotime($start)) {
        $errors['tanggal_selesai'] = 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
    }

    if (!in_array($status, $statuses, true)) {
        $errors['status'] = 'Status harus salah satu dari: pending, approved, rejected.';
    }

    if ($reason !== '' && mb_strlen($reason) > 500) {
        $errors['alasan'] = 'Alasan maksimal 500 karakter.';
    }

    if ($errors !== []) {
        json_error('Validasi gagal.', 422, $errors);
    }

    return [
        'employee_id' => $employeeId,
        'type'        => $type,
        'start_date'  => $start,
        'end_date'    => $end,
        'reason'      => $reason !== '' ? $reason : null,
        'status'      => $status,
    ];
}
