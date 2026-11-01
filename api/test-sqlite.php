<?php

header('Content-Type: text/plain');

echo "PHP Version: " . PHP_VERSION . PHP_EOL;

try {
    $pdo = new PDO('sqlite::memory:');

    echo "PDO SQLite: CONNECTED" . PHP_EOL;

    $pdo->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

    $pdo->exec("
        CREATE TABLE test (
            id INTEGER PRIMARY KEY,
            name TEXT
        )
    ");

    echo "SQLite Query: SUCCESS" . PHP_EOL;

} catch (PDOException $e) {
    echo "ERROR: " . $e->getMessage();
}