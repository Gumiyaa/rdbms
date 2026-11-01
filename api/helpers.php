<?php

declare(strict_types=1);

/**
 * Helper umum untuk seluruh endpoint API:
 * - header JSON + CORS untuk development
 * - session PHP
 * - response / error JSON konsisten
 * - pembacaan body JSON
 * - autentikasi sederhana berbasis session
 * - mapper data database -> format yang dipakai frontend
 */

require_once __DIR__ . '/config/database.php';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// ------------------------------------------------------------------- CORS dev
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#i', $origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// -------------------------------------------------------------------- session
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

set_exception_handler(static function (Throwable $e): void {
    error_log('[rdbms-api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    json_error('Terjadi kesalahan pada server.', 500);
});

// ------------------------------------------------------------------- response
function json_response(mixed $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_success(mixed $data = null, array $meta = [], int $status = 200): never
{
    $payload = ['success' => true, 'data' => $data];
    if ($meta !== []) {
        $payload['meta'] = $meta;
    }

    json_response($payload, $status);
}

function json_error(string $message, int $status = 400, ?array $errors = null): never
{
    $payload = ['success' => false, 'message' => $message];
    if ($errors !== null) {
        $payload['errors'] = $errors;
    }

    json_response($payload, $status);
}

// -------------------------------------------------------------------- request
function require_method(array $allowed): string
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    if ($method === 'PATCH') {
        $method = 'PUT';
    }

    if (!in_array($method, $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        json_error('Metode HTTP tidak diizinkan.', 405);
    }

    return $method;
}

/**
 * Membaca body request (JSON atau form-urlencoded).
 */
function request_body(): array
{
    $raw = file_get_contents('php://input');

    if ($raw === false || trim($raw) === '') {
        return $_POST !== [] ? $_POST : [];
    }

    $decoded = json_decode($raw, true);

    if (!is_array($decoded)) {
        json_error('Body request harus berupa JSON yang valid.', 400);
    }

    return $decoded;
}

/**
 * Mengambil nilai pertama yang ada dari body.
 */
function input(array $body, array $keys, mixed $default = null): mixed
{
    foreach ($keys as $key) {
        if (array_key_exists($key, $body) && $body[$key] !== null && $body[$key] !== '') {
            return $body[$key];
        }
    }

    return $default;
}

/**
 * Mengambil nilai berdasarkan daftar alias key (key pertama yang ada dipakai),
 * termasuk bila nilainya string kosong / null.
 */
function pick(array $body, array $keys, mixed $default = null): mixed
{
    foreach ($keys as $key) {
        if (array_key_exists($key, $body)) {
            return $body[$key];
        }
    }

    return $default;
}

function query_param(string $key, mixed $default = null): mixed
{
    if (!isset($_GET[$key]) || $_GET[$key] === '') {
        return $default;
    }

    return $_GET[$key];
}

function query_int(string $key): ?int
{
    $value = query_param($key);

    return ($value === null || !is_numeric($value)) ? null : (int) $value;
}

function body_int(mixed $value): ?int
{
    return ($value === null || $value === '' || !is_numeric($value)) ? null : (int) $value;
}

// ---------------------------------------------------------------- auth/session
function current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    $stmt = db()->prepare(
        'SELECT u.id, u.name, u.email, u.role, u.employee_id,
                e.nip, e.name AS employee_name, e.avatar
         FROM users u
         LEFT JOIN employees e ON e.id = u.employee_id
         WHERE u.id = ?'
    );
    $stmt->execute([(int) $_SESSION['user_id']]);
    $row = $stmt->fetch();

    if (!$row) {
        return null;
    }

    return [
        'id'          => (int) $row['id'],
        'name'        => $row['name'],
        'email'       => $row['email'],
        'role'        => $row['role'],
        'employee_id' => $row['employee_id'] !== null ? (int) $row['employee_id'] : null,
        'nip'         => $row['nip'],
        'avatar'      => $row['avatar'] ?: DEFAULT_AVATAR,
    ];
}

function require_auth(): array
{
    $user = current_user();

    if ($user === null) {
        json_error('Sesi tidak valid. Silakan login kembali.', 401);
    }

    return $user;
}

/**
 * Data yang dikirim saat login / cek sesi: profil user + absensi hari ini.
 */
function build_session_payload(array $user): array
{
    $payload = [
        'user'             => $user,
        'today_attendance' => null,
    ];

    if ($user['employee_id'] !== null) {
        $stmt = db()->prepare(
            'SELECT id, date, check_in, check_out, status
             FROM attendances WHERE employee_id = ? AND date = ?'
        );
        $stmt->execute([$user['employee_id'], today()]);
        $row = $stmt->fetch();

        if ($row) {
            $payload['today_attendance'] = [
                'id'        => (int) $row['id'],
                'date'      => $row['date'],
                'check_in'  => $row['check_in'],
                'check_out' => $row['check_out'],
                'status'    => $row['status'],
            ];
        }
    }

    return $payload;
}

// -------------------------------------------------------------------- helpers
function today(): string
{
    return date('Y-m-d');
}

function is_valid_date(?string $value): bool
{
    if (!is_string($value) || $value === '') {
        return false;
    }

    $date = DateTimeImmutable::createFromFormat('Y-m-d', $value);

    return $date !== false && $date->format('Y-m-d') === $value;
}

function is_valid_time(?string $value): bool
{
    if (!is_string($value) || $value === '') {
        return false;
    }

    return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value) === 1;
}

function format_budget(int $value): string
{
    if ($value >= 1_000_000_000) {
        return 'Rp ' . trim(trim(number_format($value / 1_000_000_000, 1, ',', '.'), '0'), ',') . ' M';
    }

    if ($value >= 1_000_000) {
        return 'Rp ' . trim(trim(number_format($value / 1_000_000, 1, ',', '.'), '0'), ',') . ' JT';
    }

    return 'Rp ' . number_format($value, 0, ',', '.');
}

/**
 * Menerima angka (450000000) atau teks ("Rp 450 JT", "1,5 M").
 */
function parse_budget(mixed $value): ?int
{
    if ($value === null || $value === '') {
        return null;
    }

    if (is_numeric($value)) {
        return max(0, (int) round((float) $value));
    }

    $text = strtoupper(trim((string) $value));
    $text = str_replace(['RP', ' ', '.'], ['', '', ''], $text);
    $text = str_replace(',', '.', $text);

    if (!preg_match('/^([0-9]+(?:\.[0-9]+)?)\s*(JT|JUTA|M|MILIAR)?$/', $text, $matches)) {
        return null;
    }

    $number = (float) $matches[1];
    $unit = $matches[2] ?? '';

    if (in_array($unit, ['JT', 'JUTA'], true)) {
        $number *= 1_000_000;
    } elseif (in_array($unit, ['M', 'MILIAR'], true)) {
        $number *= 1_000_000_000;
    }

    return (int) round($number);
}

// --------------------------------------------------------------------- mapper
function map_employee(array $row): array
{
    return [
        'id'            => (int) $row['id'],
        'nip'           => $row['nip'],
        'nama'          => $row['name'],
        'name'          => $row['name'],
        'email'         => $row['email'],
        'departemen'    => $row['department_name'] ?? '-',
        'departemen_id' => $row['department_id'] !== null ? (int) $row['department_id'] : null,
        'jabatan'       => $row['position_name'] ?? '-',
        'jabatan_id'    => $row['position_id'] !== null ? (int) $row['position_id'] : null,
        'status'        => $row['status'],
        'telepon'       => $row['phone'] ?? '',
        'joinDate'      => $row['join_date'],
        'join_date'     => $row['join_date'],
        'avatar'        => $row['avatar'] ?: DEFAULT_AVATAR,
        'created_at'    => $row['created_at'] ?? null,
        'updated_at'    => $row['updated_at'] ?? null,
    ];
}

function map_department(array $row): array
{
    $budget = (int) $row['budget'];

    return [
        'id'            => (int) $row['id'],
        'kode'          => $row['code'],
        'code'          => $row['code'],
        'nama'          => $row['name'],
        'name'          => $row['name'],
        'kepala'        => $row['head_name'] ?? '-',
        'kepala_id'     => $row['head_id'] !== null ? (int) $row['head_id'] : null,
        'anggota'       => (int) ($row['member_count'] ?? 0),
        'lokasi'        => $row['location'] ?? '-',
        'location'      => $row['location'] ?? '-',
        'anggaran'      => format_budget($budget),
        'anggaran_nilai' => $budget,
        'budget'        => $budget,
        'created_at'    => $row['created_at'] ?? null,
        'updated_at'    => $row['updated_at'] ?? null,
    ];
}

function map_position(array $row): array
{
    return [
        'id'        => (int) $row['id'],
        'kode'      => $row['code'],
        'code'      => $row['code'],
        'nama'      => $row['name'],
        'name'      => $row['name'],
        'level'     => $row['level'],
        'gajiMin'   => (int) $row['salary_min'],
        'gajiMax'   => (int) $row['salary_max'],
        'salary_min' => (int) $row['salary_min'],
        'salary_max' => (int) $row['salary_max'],
        'pemegang'  => (int) ($row['holder_count'] ?? 0),
        'created_at' => $row['created_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
    ];
}

function map_attendance(array $row): array
{
    return [
        'id'           => (int) $row['id'],
        'employee_id'  => (int) $row['employee_id'],
        'nip'          => $row['nip'],
        'nama'         => $row['employee_name'],
        'departemen'   => $row['department_name'] ?? '-',
        'tanggal'      => $row['date'],
        'date'         => $row['date'],
        'masuk'        => $row['check_in'] ?: '-',
        'keluar'       => $row['check_out'] ?: '-',
        'check_in'     => $row['check_in'],
        'check_out'    => $row['check_out'],
        'status'       => $row['status'],
        'lokasi'       => $row['location'] ?: '-',
        'notes'        => $row['notes'],
    ];
}

function map_leave_request(array $row): array
{
    return [
        'id'             => (int) $row['id'],
        'employee_id'    => (int) $row['employee_id'],
        'nip'            => $row['nip'],
        'nama'           => $row['employee_name'],
        'departemen'     => $row['department_name'] ?? '-',
        'jenis'          => $row['type'],
        'type'           => $row['type'],
        'tanggal_mulai'  => $row['start_date'],
        'tanggal_selesai' => $row['end_date'],
        'start_date'     => $row['start_date'],
        'end_date'       => $row['end_date'],
        'alasan'         => $row['reason'] ?? '',
        'reason'         => $row['reason'] ?? '',
        'status'         => $row['status'],
        'created_at'     => $row['created_at'] ?? null,
        'updated_at'     => $row['updated_at'] ?? null,
    ];
}

/**
 * Mengubah PDOException menjadi response JSON yang aman
 * (tidak membocorkan detail query / struktur database).
 */
function handle_db_exception(PDOException $e, string $fallbackMessage = 'Operasi database gagal.'): never
{
    $message = $e->getMessage();

    if (str_contains($message, 'UNIQUE constraint failed')) {
        if (str_contains($message, 'employees.nip')) {
            json_error('NIP sudah digunakan karyawan lain.', 409, ['nip' => 'NIP sudah digunakan.']);
        }
        if (str_contains($message, 'employees.email') || str_contains($message, 'users.email')) {
            json_error('Email sudah digunakan.', 409, ['email' => 'Email sudah digunakan.']);
        }
        if (str_contains($message, 'departments.name')) {
            json_error('Nama departemen sudah ada.', 409, ['nama' => 'Nama departemen sudah ada.']);
        }
        if (str_contains($message, 'departments.code')) {
            json_error('Kode departemen sudah ada.', 409, ['kode' => 'Kode departemen sudah ada.']);
        }
        if (str_contains($message, 'positions.name')) {
            json_error('Nama jabatan sudah ada.', 409, ['nama' => 'Nama jabatan sudah ada.']);
        }
        if (str_contains($message, 'positions.code')) {
            json_error('Kode jabatan sudah ada.', 409, ['kode' => 'Kode jabatan sudah ada.']);
        }
        if (str_contains($message, 'attendances.employee_id')) {
            json_error('Absensi karyawan pada tanggal tersebut sudah tercatat.', 409);
        }

        json_error('Data yang dimasukkan sudah ada (duplikat).', 409);
    }

    if (str_contains($message, 'FOREIGN KEY constraint failed')) {
        json_error('Data terkait tidak ditemukan atau masih digunakan oleh data lain.', 409);
    }

    if (str_contains($message, 'CHECK constraint failed')) {
        json_error('Nilai yang dimasukkan tidak valid.', 422);
    }

    error_log('[rdbms-api] ' . $message);

    json_error($fallbackMessage, 500);
}
