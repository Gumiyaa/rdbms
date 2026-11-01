<?php

/**
 * Jembatan CLI kecil untuk menguji fungsi murni di api/helpers.php
 * tanpa menjalankan web server.
 *
 * Input  (STDIN): {"fn": "format_budget", "args": [450000000]}
 * Output (STDOUT): {"ok": true, "result": "Rp 450 JT"}
 */

declare(strict_types=1);

ini_set('session.save_path', sys_get_temp_dir());

require_once __DIR__ . '/../../api/helpers.php';

$raw = stream_get_contents(STDIN);
$payload = json_decode((string) $raw, true);

if (!is_array($payload) || !isset($payload['fn'])) {
    fwrite(STDERR, "Payload harus JSON: {\"fn\": \"...\", \"args\": [...]}\n");
    exit(2);
}

$allowed = [
    'format_budget',
    'parse_budget',
    'is_valid_date',
    'is_valid_time',
    'map_employee',
    'map_department',
    'map_position',
    'map_attendance',
    'map_leave_request',
];

$fn = (string) $payload['fn'];

if (!in_array($fn, $allowed, true)) {
    fwrite(STDERR, "Fungsi tidak diizinkan: {$fn}\n");
    exit(2);
}

$args = is_array($payload['args'] ?? null) ? $payload['args'] : [];

try {
    $result = $fn(...$args);
} catch (Throwable $e) {
    fwrite(STDERR, get_class($e) . ': ' . $e->getMessage() . "\n");
    exit(1);
}

echo json_encode(
    ['ok' => true, 'result' => $result],
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);
