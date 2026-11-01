<?php

/**
 * Endpoint autentikasi berbasis session PHP.
 *
 * GET  /api/auth.php?action=me      -> user yang sedang login (+ absensi hari ini)
 * POST /api/auth.php?action=login   -> { email, password }
 * POST /api/auth.php?action=logout
 */

require_once __DIR__ . '/helpers.php';

$method = require_method(['GET', 'POST']);
$action = (string) query_param('action', 'me');

if ($method === 'GET') {
    if ($action !== 'me') {
        json_error('Aksi tidak dikenal.', 404);
    }

    $user = current_user();

    if ($user === null) {
        json_error('Belum login.', 401);
    }

    json_success(build_session_payload($user));
}

$body = request_body();

if ($action === 'logout') {
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires'  => time() - 42000,
            'path'     => $params['path'],
            'domain'   => $params['domain'],
            'secure'   => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => 'Lax',
        ]);
    }

    session_destroy();

    json_success(['logged_out' => true]);
}

if ($action !== 'login') {
    json_error('Aksi tidak dikenal.', 404);
}

$email = strtolower(trim((string) input($body, ['email'], '')));
$password = (string) input($body, ['password'], '');

$errors = [];

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Email tidak valid.';
}

if ($password === '') {
    $errors['password'] = 'Kata sandi wajib diisi.';
}

if ($errors !== []) {
    json_error('Validasi gagal.', 422, $errors);
}

$stmt = db()->prepare(
    'SELECT u.id, u.name, u.email, u.role, u.employee_id, u.password_hash,
            e.nip, e.name AS employee_name, e.avatar
     FROM users u
     LEFT JOIN employees e ON e.id = u.employee_id
     WHERE LOWER(u.email) = ?'
);
$stmt->execute([$email]);
$row = $stmt->fetch();

if (!$row || !password_verify($password, $row['password_hash'])) {
    usleep(250000);
    json_error('Email atau kata sandi salah.', 401);
}

if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
    db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), (int) $row['id']]);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $row['id'];
$_SESSION['last_activity'] = time();

$user = [
    'id'          => (int) $row['id'],
    'name'        => $row['name'],
    'email'       => $row['email'],
    'role'        => $row['role'],
    'employee_id' => $row['employee_id'] !== null ? (int) $row['employee_id'] : null,
    'nip'         => $row['nip'],
    'avatar'      => $row['avatar'] ?: DEFAULT_AVATAR,
];

json_success(build_session_payload($user));
