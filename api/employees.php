<?php

/**
 * Endpoint manajemen karyawan.
 *
 * GET    /api/employees.php                    -> daftar (q, department_id, position_id, status)
 * GET    /api/employees.php?id=1               -> detail
 * POST   /api/employees.php                    -> tambah
 * PUT    /api/employees.php?id=1               -> ubah
 * DELETE /api/employees.php?id=1               -> hapus
 */

require_once __DIR__ . '/helpers.php';

require_auth();

$method = require_method(['GET', 'POST', 'PUT', 'DELETE']);
$pdo = db();

switch ($method) {
    case 'GET':
        $id = query_int('id');

        if ($id !== null) {
            $employee = fetch_employee($pdo, $id);

            if ($employee === null) {
                json_error('Karyawan tidak ditemukan.', 404);
            }

            json_success($employee);
        }

        $list = fetch_employee_list($pdo);

        json_success($list, ['total' => count($list)]);

    case 'POST':
        create_employee($pdo, request_body());

    case 'PUT':
        $id = query_int('id');

        if ($id === null) {
            json_error('Parameter id wajib diisi.', 400);
        }

        update_employee($pdo, $id, request_body());

    case 'DELETE':
        delete_employee($pdo, query_int('id'));
}

json_error('Metode tidak didukung.', 405);

// ---------------------------------------------------------------------------

function fetch_employee(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT e.*, d.name AS department_name, p.name AS position_name
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN positions p   ON p.id = e.position_id
         WHERE e.id = ?'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    return $row ? map_employee($row) : null;
}

function fetch_employee_list(PDO $pdo): array
{
    $where = [];
    $params = [];

    $search = trim((string) query_param('q', ''));
    if ($search !== '') {
        $where[] = '(e.name LIKE ? OR e.nip LIKE ? OR e.email LIKE ?)';
        $like = '%' . $search . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $departmentId = query_int('department_id') ?? query_int('departemen_id');
    if ($departmentId !== null) {
        $where[] = 'e.department_id = ?';
        $params[] = $departmentId;
    }

    $positionId = query_int('position_id') ?? query_int('jabatan_id');
    if ($positionId !== null) {
        $where[] = 'e.position_id = ?';
        $params[] = $positionId;
    }

    $status = trim((string) query_param('status', ''));
    if ($status !== '' && $status !== 'Semua') {
        $where[] = 'e.status = ?';
        $params[] = $status;
    }

    $limit = query_int('limit') ?? 500;
    $limit = max(1, min($limit, 1000));

    $sql = 'SELECT e.*, d.name AS department_name, p.name AS position_name
            FROM employees e
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN positions p   ON p.id = e.position_id';

    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY e.name ASC LIMIT ' . $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    return array_map('map_employee', $stmt->fetchAll());
}

function create_employee(PDO $pdo, array $body): never
{
    $data = validate_employee($pdo, $body, null);

    $stmt = $pdo->prepare(
        'INSERT INTO employees (nip, name, email, department_id, position_id, status, phone, join_date, avatar)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    try {
        $stmt->execute([
            $data['nip'],
            $data['name'],
            $data['email'],
            $data['department_id'],
            $data['position_id'],
            $data['status'],
            $data['phone'],
            $data['join_date'],
            $data['avatar'],
        ]);
    } catch (PDOException $e) {
        handle_db_exception($e, 'Gagal menambahkan karyawan.');
    }

    $employee = fetch_employee($pdo, (int) $pdo->lastInsertId());

    json_success($employee, [], 201);
}

function update_employee(PDO $pdo, int $id, array $body): never
{
    $existing = $pdo->prepare('SELECT * FROM employees WHERE id = ?');
    $existing->execute([$id]);
    $row = $existing->fetch();

    if (!$row) {
        json_error('Karyawan tidak ditemukan.', 404);
    }

    // Gabungkan data lama dengan data yang dikirim (partial update).
    $merged = [
        'nip'           => $row['nip'],
        'nama'          => $row['name'],
        'email'         => $row['email'],
        'departemen_id' => $row['department_id'],
        'jabatan_id'    => $row['position_id'],
        'status'        => $row['status'],
        'telepon'       => $row['phone'],
        'join_date'     => $row['join_date'],
        'avatar'        => $row['avatar'],
    ];

    $aliases = [
        'nip'           => ['nip'],
        'nama'          => ['nama', 'name'],
        'email'         => ['email'],
        'departemen_id' => ['departemen_id', 'department_id'],
        'jabatan_id'    => ['jabatan_id', 'position_id'],
        'status'        => ['status'],
        'telepon'       => ['telepon', 'phone'],
        'join_date'     => ['join_date', 'joinDate'],
        'avatar'        => ['avatar'],
    ];

    foreach ($aliases as $canonical => $keys) {
        foreach ($keys as $key) {
            if (array_key_exists($key, $body)) {
                $merged[$canonical] = $body[$key];
                break;
            }
        }
    }

    $data = validate_employee($pdo, $merged, $id);

    $stmt = $pdo->prepare(
        'UPDATE employees
         SET nip = ?, name = ?, email = ?, department_id = ?, position_id = ?,
             status = ?, phone = ?, join_date = ?, avatar = ?, updated_at = datetime(\'now\')
         WHERE id = ?'
    );

    try {
        $stmt->execute([
            $data['nip'],
            $data['name'],
            $data['email'],
            $data['department_id'],
            $data['position_id'],
            $data['status'],
            $data['phone'],
            $data['join_date'],
            $data['avatar'],
            $id,
        ]);
    } catch (PDOException $e) {
        handle_db_exception($e, 'Gagal mengubah data karyawan.');
    }

    json_success(fetch_employee($pdo, $id));
}

function delete_employee(PDO $pdo, ?int $id): never
{
    if ($id === null) {
        json_error('Parameter id wajib diisi.', 400);
    }

    $exists = $pdo->prepare('SELECT 1 FROM employees WHERE id = ?');
    $exists->execute([$id]);

    if (!$exists->fetchColumn()) {
        json_error('Karyawan tidak ditemukan.', 404);
    }

    $pdo->prepare('DELETE FROM employees WHERE id = ?')->execute([$id]);

    json_success(['id' => $id, 'deleted' => true]);
}

/**
 * Validasi + normalisasi data karyawan.
 *
 * @return array{nip: string, name: string, email: string, department_id: ?int,
 *               position_id: ?int, status: string, phone: string,
 *               join_date: string, avatar: string}
 */
function validate_employee(PDO $pdo, array $body, ?int $ignoreId): array
{
    $errors = [];

    $nip = trim((string) pick($body, ['nip'], ''));
    $name = trim((string) pick($body, ['nama', 'name'], ''));
    $email = strtolower(trim((string) pick($body, ['email'], '')));
    $status = trim((string) pick($body, ['status'], 'Aktif'));
    $phone = trim((string) pick($body, ['telepon', 'phone'], ''));
    $joinDate = trim((string) pick($body, ['join_date', 'joinDate'], today()));
    $avatar = trim((string) pick($body, ['avatar'], DEFAULT_AVATAR));

    $departmentId = body_int(pick($body, ['departemen_id', 'department_id']));
    $positionId = body_int(pick($body, ['jabatan_id', 'position_id']));

    // Bisa juga dikirim sebagai nama (fleksibel untuk pemakaian API langsung).
    if ($departmentId === null && is_string(pick($body, ['departemen', 'department']))) {
        $departmentId = resolve_department_id($pdo, (string) pick($body, ['departemen', 'department']));
    }

    if ($positionId === null && is_string(pick($body, ['jabatan', 'position']))) {
        $positionId = resolve_position_id($pdo, (string) pick($body, ['jabatan', 'position']));
    }

    if ($name === '') {
        $errors['nama'] = 'Nama karyawan wajib diisi.';
    } elseif (mb_strlen($name) > 120) {
        $errors['nama'] = 'Nama karyawan maksimal 120 karakter.';
    }

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Format email tidak valid.';
    } elseif (mb_strlen($email) > 160) {
        $errors['email'] = 'Email maksimal 160 karakter.';
    }

    if ($nip === '') {
        $nip = next_nip($pdo);
    } elseif (mb_strlen($nip) > 30) {
        $errors['nip'] = 'NIP maksimal 30 karakter.';
    }

    if (!in_array($status, ['Aktif', 'Cuti', 'Resign'], true)) {
        $errors['status'] = 'Status harus salah satu dari: Aktif, Cuti, Resign.';
    }

    if (!is_valid_date($joinDate)) {
        $errors['join_date'] = 'Tanggal bergabung harus berformat YYYY-MM-DD.';
    }

    if ($departmentId !== null && !record_exists($pdo, 'departments', $departmentId)) {
        $errors['departemen_id'] = 'Departemen tidak ditemukan.';
    }

    if ($positionId !== null && !record_exists($pdo, 'positions', $positionId)) {
        $errors['jabatan_id'] = 'Jabatan tidak ditemukan.';
    }

    if ($avatar !== '' && mb_strlen($avatar) > 500) {
        $errors['avatar'] = 'URL avatar terlalu panjang.';
    }

    if ($phone !== '' && mb_strlen($phone) > 30) {
        $errors['telepon'] = 'Nomor telepon maksimal 30 karakter.';
    }

    // Cek keunikan NIP & email (pesan lebih ramah daripada error SQLite).
    $uniqueStmt = $pdo->prepare('SELECT id FROM employees WHERE (nip = ? OR LOWER(email) = ?) AND id != ?');
    $uniqueStmt->execute([$nip, $email, $ignoreId ?? 0]);

    while ($conflict = $uniqueStmt->fetch()) {
        $detail = $pdo->prepare('SELECT nip, LOWER(email) AS email FROM employees WHERE id = ?');
        $detail->execute([(int) $conflict['id']]);
        $other = $detail->fetch();

        if ($other && $other['nip'] === $nip) {
            $errors['nip'] = 'NIP sudah digunakan karyawan lain.';
        }

        if ($other && $other['email'] === $email) {
            $errors['email'] = 'Email sudah digunakan karyawan lain.';
        }
    }

    if ($errors !== []) {
        json_error('Validasi gagal.', 422, $errors);
    }

    return [
        'nip'           => $nip,
        'name'          => $name,
        'email'         => $email,
        'department_id' => $departmentId,
        'position_id'   => $positionId,
        'status'        => $status,
        'phone'         => $phone,
        'join_date'     => $joinDate,
        'avatar'        => $avatar !== '' ? $avatar : DEFAULT_AVATAR,
    ];
}

function next_nip(PDO $pdo): string
{
    $max = (int) $pdo->query(
        "SELECT COALESCE(MAX(CAST(SUBSTR(nip, 4) AS INTEGER)), 2023000) FROM employees WHERE nip LIKE 'HR-%'"
    )->fetchColumn();

    return 'HR-' . ($max + 1);
}

function record_exists(PDO $pdo, string $table, int $id): bool
{
    $allowed = ['departments', 'positions', 'employees'];

    if (!in_array($table, $allowed, true)) {
        return false;
    }

    $stmt = $pdo->prepare("SELECT 1 FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);

    return (bool) $stmt->fetchColumn();
}

function resolve_department_id(PDO $pdo, string $name): ?int
{
    $stmt = $pdo->prepare('SELECT id FROM departments WHERE name = ? COLLATE NOCASE');
    $stmt->execute([$name]);
    $id = $stmt->fetchColumn();

    return $id === false ? null : (int) $id;
}

function resolve_position_id(PDO $pdo, string $name): ?int
{
    $stmt = $pdo->prepare('SELECT id FROM positions WHERE name = ? COLLATE NOCASE');
    $stmt->execute([$name]);
    $id = $stmt->fetchColumn();

    return $id === false ? null : (int) $id;
}
