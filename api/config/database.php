<?php

/**
 * Koneksi database SQLite (PDO) + inisialisasi skema otomatis.
 *
 * Lokasi file database sengaja berada DI LUAR public web root
 * (D:\Program\Laragon\storage\rdbms\employee_management.db) agar tidak bisa
 * diunduh langsung lewat browser.
 */

require_once __DIR__ . '/schema.php';
require_once __DIR__ . '/seed.php';

const RDBMS_SCHEMA_VERSION = '1';

/**
 * Path file database. Bisa dioverride lewat environment variable RDBMS_DB_PATH.
 */
function db_path(): string
{
    $custom = getenv('RDBMS_DB_PATH');
    if (is_string($custom) && trim($custom) !== '') {
        return $custom;
    }

    // api/config -> api -> rdbms -> www -> Laragon
    $laragonRoot = dirname(__DIR__, 4);
    $preferred = $laragonRoot . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'rdbms' . DIRECTORY_SEPARATOR . 'employee_management.db';

    $directory = dirname($preferred);
    if (is_dir($directory) || @mkdir($directory, 0775, true) || is_dir($directory)) {
        return $preferred;
    }

    // Fallback (misalnya proyek dipindah keluar dari Laragon).
    $fallbackDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'rdbms';
    if (!is_dir($fallbackDir)) {
        @mkdir($fallbackDir, 0775, true);
    }

    return $fallbackDir . DIRECTORY_SEPARATOR . 'employee_management.db';
}

/**
 * Koneksi PDO singleton.
 */
function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $path = db_path();

    try {
        $pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        error_log('[rdbms-api] Gagal membuka database: ' . $e->getMessage());
        throw new RuntimeException('Koneksi database gagal.', 0, $e);
    }

    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA busy_timeout = 5000');
    $pdo->exec('PRAGMA journal_mode = WAL');

    init_database($pdo);

    return $pdo;
}

/**
 * Membuat tabel & data awal bila belum ada.
 * Tidak pernah menghapus data yang sudah tersimpan.
 */
function init_database(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS app_meta (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )'
    );

    $stmt = $pdo->prepare('SELECT value FROM app_meta WHERE key = ?');
    $stmt->execute(['schema_version']);
    $currentVersion = $stmt->fetchColumn();

    if ($currentVersion === RDBMS_SCHEMA_VERSION) {
        return;
    }

    /** @var array<int, string> $statements */
    $statements = require __DIR__ . '/schema.php';

    $pdo->beginTransaction();

    try {
        foreach ($statements as $sql) {
            $pdo->exec($sql);
        }

        seed_database($pdo);

        $pdo->prepare(
            'INSERT INTO app_meta (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value'
        )->execute(['schema_version', RDBMS_SCHEMA_VERSION]);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        // Bila proses lain sudah lebih dulu menyelesaikan inisialisasi, abaikan.
        $stmt = $pdo->prepare('SELECT value FROM app_meta WHERE key = ?');
        $stmt->execute(['schema_version']);

        if ($stmt->fetchColumn() === RDBMS_SCHEMA_VERSION) {
            return;
        }

        error_log('[rdbms-api] Inisialisasi database gagal: ' . $e->getMessage());
        throw new RuntimeException('Inisialisasi database gagal.', 0, $e);
    }
}
