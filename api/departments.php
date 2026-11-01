<?php

/**
 * Endpoint manajemen departemen.
 *
 * GET    /api/departments.php          -> daftar
 * GET    /api/departments.php?id=1     -> detail
 * POST   /api/departments.php          -> tambah
 * PUT    /api/departments.php?id=1     -> ubah
 * DELETE /api/departments.php?id=1     -> hapus
 */

require_once __DIR__ . '/helpers.php';

require_auth();

$method = require_method(['GET', 'POST', 'PUT', 'DELETE']);
$pdo = db();

switch ($method) {
    case 'GET':
        $id = query_int('id');

        if ($id !== null) {
            $department = fetch_department($pdo, $id);

            if ($department === null) {
                json_error('Departemen tidak ditemukan.', 404);
            }

            json_success($department);
        }

        $list = fetch_department_list($pdo);

        json_success($list, ['total' => count($list)]);

    case 'POST':
        create_department($pdo, request_body());

    case 'PUT':
        $id = query_int('id');

        if ($id === null) {
            json_error('Parameter id wajib diisi.', 400);
        }

        update_department($pdo, $id, request_body());

    case 'DELETE':
        delete_department($pdo, query_int('id'));
}

json_error('Metode tidak didukung.', 405);

// ---------------------------------------------------------------------------

function fetch_department(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT d.*, e.name AS head_name,
                (SELECT COUNT(*) FROM employees emp WHERE emp.department_id = d.id) AS member_count
         FROM departments d
         LEFT JOIN employees e ON e.id = d.head_id
         WHERE d.id = ?'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    return $row ? map_department($row) : null;
}

function fetch_department_list(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT d.*, e.name AS head_name,
                (SELECT COUNT(*) FROM employees emp WHERE emp.department_id = d.id) AS member_count
         FROM departments d
         LEFT JOIN employees e ON e.id = d.head_id
         ORDER BY d.name ASC'
    );

    return array_map('map_department', $stmt->fetchAll());
}

function create_department(PDO $pdo, array $body): never
{
    $data = validate_department($pdo, $body, null);

    $stmt = $pdo->prepare(
        'INSERT INTO departments (code, name, head_id, location, budget) VALUES (?, ?, ?, ?, ?)'
    );

    try {
        $stmt->execute([
            $data['code'],
            $data['name'],
            $data['head_id'],
            $data['location'],
            $data['budget'],
        ]);
    } catch (PDOException $e) {
        handle_db_exception($e, 'Gagal menambahkan departemen.');
    }

    json_success(fetch_department($pdo, (int) $pdo->lastInsertId()), [], 201);
}

function update_department(PDO $pdo, int $id, array $body): never
{
    $existing = $pdo->prepare('SELECT * FROM departments WHERE id = ?');
    $existing->execute([$id]);
    $row = $existing->fetch();

    if (!$row) {
        json_error('Departemen tidak ditemukan.', 404);
    }

    $merged = [
        'kode'      => $row['code'],
        'nama'      => $row['name'],
        'kepala_id' => $row['head_id'],
        'lokasi'    => $row['location'],
        'anggaran'  => $row['budget'],
    ];

    $aliases = [
        'kode'      => ['kode', 'code'],
        'nama'      => ['nama', 'name'],
        'kepala_id' => ['kepala_id', 'head_id'],
        'lokasi'    => ['lokasi', 'location'],
        'anggaran'  => ['anggaran', 'budget'],
    ];

    foreach ($aliases as $canonical => $keys) {
        foreach ($keys as $key) {
            if (array_key_exists($key, $body)) {
                $merged[$canonical] = $body[$key];
                break;
            }
        }
    }

    $data = validate_department($pdo, $merged, $id);

    $stmt = $pdo->prepare(
        'UPDATE departments
         SET code = ?, name = ?, head_id = ?, location = ?, budget = ?, updated_at = datetime(\'now\')
         WHERE id = ?'
    );

    try {
        $stmt->execute([
            $data['code'],
            $data['name'],
            $data['head_id'],
            $data['location'],
            $data['budget'],
            $id,
        ]);
    } catch (PDOException $e) {
        handle_db_exception($e, 'Gagal mengubah departemen.');
    }

    json_success(fetch_department($pdo, $id));
}

function delete_department(PDO $pdo, ?int $id): never
{
    if ($id === null) {
        json_error('Parameter id wajib diisi.', 400);
    }

    $exists = $pdo->prepare('SELECT 1 FROM departments WHERE id = ?');
    $exists->execute([$id]);

    if (!$exists->fetchColumn()) {
        json_error('Departemen tidak ditemukan.', 404);
    }

    // employees.department_id -> ON DELETE SET NULL (karyawan tetap ada,
    // hanya kehilangan relasi departemen).
    $pdo->prepare('DELETE FROM departments WHERE id = ?')->execute([$id]);

    json_success(['id' => $id, 'deleted' => true]);
}

/**
 * @return array{code: string, name: string, head_id: ?int, location: string, budget: int}
 */
function validate_department(PDO $pdo, array $body, ?int $ignoreId): array
{
    $errors = [];

    $name = trim((string) pick($body, ['nama', 'name'], ''));
    $code = strtoupper(trim((string) pick($body, ['kode', 'code'], '')));
    $location = trim((string) pick($body, ['lokasi', 'location'], ''));
    $headId = body_int(pick($body, ['kepala_id', 'head_id']));
    $budgetRaw = pick($body, ['anggaran', 'budget'], null);

    if ($name === '') {
        $errors['nama'] = 'Nama departemen wajib diisi.';
    } elseif (mb_strlen($name) > 100) {
        $errors['nama'] = 'Nama departemen maksimal 100 karakter.';
    }

    if ($code === '') {
        $code = generate_department_code($pdo, $name);
    } elseif (mb_strlen($code) > 20) {
        $errors['kode'] = 'Kode departemen maksimal 20 karakter.';
    }

    if ($location !== '' && mb_strlen($location) > 150) {
        $errors['lokasi'] = 'Lokasi maksimal 150 karakter.';
    }

    $budget = 100000000;

    if ($budgetRaw !== null && $budgetRaw !== '') {
        $parsed = parse_budget($budgetRaw);

        if ($parsed === null) {
            $errors['anggaran'] = 'Anggaran tidak valid. Contoh: 450000000 atau "Rp 450 JT".';
        } else {
            $budget = $parsed;
        }
    }

    if ($headId !== null) {
        $headCheck = $pdo->prepare('SELECT 1 FROM employees WHERE id = ?');
        $headCheck->execute([$headId]);

        if (!$headCheck->fetchColumn()) {
            $errors['kepala_id'] = 'Kepala departemen tidak ditemukan.';
        }
    }

    // Unik: nama & kode.
    $unique = $pdo->prepare(
        'SELECT id, code, name FROM departments WHERE (code = ? OR name = ? COLLATE NOCASE) AND id != ?'
    );
    $unique->execute([$code, $name, $ignoreId ?? 0]);

    while ($conflict = $unique->fetch()) {
        if ($conflict['code'] === $code) {
            $errors['kode'] = 'Kode departemen sudah digunakan.';
        }

        if (mb_strtolower($conflict['name']) === mb_strtolower($name)) {
            $errors['nama'] = 'Nama departemen sudah ada.';
        }
    }

    if ($errors !== []) {
        json_error('Validasi gagal.', 422, $errors);
    }

    return [
        'code'     => $code,
        'name'     => $name,
        'head_id'  => $headId,
        'location' => $location,
        'budget'   => $budget,
    ];
}

function generate_department_code(PDO $pdo, string $name): string
{
    $slug = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $name) ?? '');
    $base = 'DEPT-' . (substr($slug, 0, 3) !== '' ? substr($slug, 0, 3) : 'NEW');
    $code = $base;
    $counter = 2;

    $stmt = $pdo->prepare('SELECT 1 FROM departments WHERE code = ?');

    while (true) {
        $stmt->execute([$code]);

        if (!$stmt->fetchColumn()) {
            return $code;
        }

        $code = $base . '-' . $counter;
        $counter++;
    }
}
