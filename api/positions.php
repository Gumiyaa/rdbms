<?php

/**
 * Endpoint manajemen jabatan / posisi.
 *
 * GET    /api/positions.php          -> daftar
 * GET    /api/positions.php?id=1     -> detail
 * POST   /api/positions.php          -> tambah
 * PUT    /api/positions.php?id=1     -> ubah
 * DELETE /api/positions.php?id=1     -> hapus
 */

require_once __DIR__ . '/helpers.php';

require_auth();

$method = require_method(['GET', 'POST', 'PUT', 'DELETE']);
$pdo = db();

switch ($method) {
    case 'GET':
        $id = query_int('id');

        if ($id !== null) {
            $position = fetch_position($pdo, $id);

            if ($position === null) {
                json_error('Jabatan tidak ditemukan.', 404);
            }

            json_success($position);
        }

        $list = fetch_position_list($pdo);

        json_success($list, ['total' => count($list)]);

    case 'POST':
        create_position($pdo, request_body());

    case 'PUT':
        $id = query_int('id');

        if ($id === null) {
            json_error('Parameter id wajib diisi.', 400);
        }

        update_position($pdo, $id, request_body());

    case 'DELETE':
        delete_position($pdo, query_int('id'));
}

json_error('Metode tidak didukung.', 405);

// ---------------------------------------------------------------------------

function fetch_position(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT p.*, (SELECT COUNT(*) FROM employees e WHERE e.position_id = p.id) AS holder_count
         FROM positions p WHERE p.id = ?'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    return $row ? map_position($row) : null;
}

function fetch_position_list(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT p.*, (SELECT COUNT(*) FROM employees e WHERE e.position_id = p.id) AS holder_count
         FROM positions p
         ORDER BY p.id ASC'
    );

    return array_map('map_position', $stmt->fetchAll());
}

function create_position(PDO $pdo, array $body): never
{
    $data = validate_position($pdo, $body, null);

    $stmt = $pdo->prepare(
        'INSERT INTO positions (code, name, level, salary_min, salary_max) VALUES (?, ?, ?, ?, ?)'
    );

    try {
        $stmt->execute([
            $data['code'],
            $data['name'],
            $data['level'],
            $data['salary_min'],
            $data['salary_max'],
        ]);
    } catch (PDOException $e) {
        handle_db_exception($e, 'Gagal menambahkan jabatan.');
    }

    json_success(fetch_position($pdo, (int) $pdo->lastInsertId()), [], 201);
}

function update_position(PDO $pdo, int $id, array $body): never
{
    $existing = $pdo->prepare('SELECT * FROM positions WHERE id = ?');
    $existing->execute([$id]);
    $row = $existing->fetch();

    if (!$row) {
        json_error('Jabatan tidak ditemukan.', 404);
    }

    $merged = [
        'kode'      => $row['code'],
        'nama'      => $row['name'],
        'level'     => $row['level'],
        'gajiMin'   => $row['salary_min'],
        'gajiMax'   => $row['salary_max'],
    ];

    $aliases = [
        'kode'    => ['kode', 'code'],
        'nama'    => ['nama', 'name'],
        'level'   => ['level'],
        'gajiMin' => ['gajiMin', 'gaji_min', 'salary_min'],
        'gajiMax' => ['gajiMax', 'gaji_max', 'salary_max'],
    ];

    foreach ($aliases as $canonical => $keys) {
        foreach ($keys as $key) {
            if (array_key_exists($key, $body)) {
                $merged[$canonical] = $body[$key];
                break;
            }
        }
    }

    $data = validate_position($pdo, $merged, $id);

    $stmt = $pdo->prepare(
        'UPDATE positions
         SET code = ?, name = ?, level = ?, salary_min = ?, salary_max = ?, updated_at = datetime(\'now\')
         WHERE id = ?'
    );

    try {
        $stmt->execute([
            $data['code'],
            $data['name'],
            $data['level'],
            $data['salary_min'],
            $data['salary_max'],
            $id,
        ]);
    } catch (PDOException $e) {
        handle_db_exception($e, 'Gagal mengubah jabatan.');
    }

    json_success(fetch_position($pdo, $id));
}

function delete_position(PDO $pdo, ?int $id): never
{
    if ($id === null) {
        json_error('Parameter id wajib diisi.', 400);
    }

    $exists = $pdo->prepare('SELECT 1 FROM positions WHERE id = ?');
    $exists->execute([$id]);

    if (!$exists->fetchColumn()) {
        json_error('Jabatan tidak ditemukan.', 404);
    }

    // employees.position_id -> ON DELETE SET NULL
    $pdo->prepare('DELETE FROM positions WHERE id = ?')->execute([$id]);

    json_success(['id' => $id, 'deleted' => true]);
}

/**
 * @return array{code: string, name: string, level: string, salary_min: int, salary_max: int}
 */
function validate_position(PDO $pdo, array $body, ?int $ignoreId): array
{
    $errors = [];

    $name = trim((string) pick($body, ['nama', 'name'], ''));
    $code = strtoupper(trim((string) pick($body, ['kode', 'code'], '')));
    $level = trim((string) pick($body, ['level'], 'Staff'));
    $salaryMin = body_int(pick($body, ['gajiMin', 'gaji_min', 'salary_min'], 0));
    $salaryMax = body_int(pick($body, ['gajiMax', 'gaji_max', 'salary_max'], 0));

    $levels = ['Manager', 'Senior', 'Specialist', 'Staff'];

    if ($name === '') {
        $errors['nama'] = 'Nama jabatan wajib diisi.';
    } elseif (mb_strlen($name) > 120) {
        $errors['nama'] = 'Nama jabatan maksimal 120 karakter.';
    }

    if ($code === '') {
        $code = generate_position_code($pdo);
    } elseif (mb_strlen($code) > 20) {
        $errors['kode'] = 'Kode jabatan maksimal 20 karakter.';
    }

    if (!in_array($level, $levels, true)) {
        $errors['level'] = 'Level harus salah satu dari: ' . implode(', ', $levels) . '.';
    }

    $salaryMin ??= 0;
    $salaryMax ??= 0;

    if ($salaryMin < 0 || $salaryMax < 0) {
        $errors['gajiMin'] = 'Nominal gaji tidak boleh negatif.';
    }

    if ($salaryMin > $salaryMax) {
        $errors['gajiMax'] = 'Gaji maksimum harus lebih besar atau sama dengan gaji minimum.';
    }

    $unique = $pdo->prepare(
        'SELECT id, code, name FROM positions WHERE (code = ? OR name = ? COLLATE NOCASE) AND id != ?'
    );
    $unique->execute([$code, $name, $ignoreId ?? 0]);

    while ($conflict = $unique->fetch()) {
        if ($conflict['code'] === $code) {
            $errors['kode'] = 'Kode jabatan sudah digunakan.';
        }

        if (mb_strtolower($conflict['name']) === mb_strtolower($name)) {
            $errors['nama'] = 'Nama jabatan sudah ada.';
        }
    }

    if ($errors !== []) {
        json_error('Validasi gagal.', 422, $errors);
    }

    return [
        'code'       => $code,
        'name'       => $name,
        'level'      => $level,
        'salary_min' => $salaryMin,
        'salary_max' => $salaryMax,
    ];
}

function generate_position_code(PDO $pdo): string
{
    $max = (int) $pdo->query(
        "SELECT COALESCE(MAX(CAST(SUBSTR(code, 5) AS INTEGER)), 0) FROM positions WHERE code LIKE 'JAB-%'"
    )->fetchColumn();

    $next = $max + 1;
    $stmt = $pdo->prepare('SELECT 1 FROM positions WHERE code = ?');

    while (true) {
        $code = 'JAB-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
        $stmt->execute([$code]);

        if (!$stmt->fetchColumn()) {
            return $code;
        }

        $next++;
    }
}
