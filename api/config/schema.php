<?php

/**
 * Skema database SQLite.
 * Setiap elemen array adalah satu statement SQL yang dijalankan sekali
 * saat database pertama kali dibuat (idempotent, memakai IF NOT EXISTS).
 *
 * Catatan relasi:
 *  - departments.head_id  -> employees.id  (ON DELETE SET NULL)
 *  - employees.department_id -> departments.id (ON DELETE SET NULL)
 *  - employees.position_id   -> positions.id   (ON DELETE SET NULL)
 *  - users.employee_id       -> employees.id   (ON DELETE SET NULL)
 *  - attendances.employee_id -> employees.id   (ON DELETE CASCADE)
 *  - leave_requests.employee_id -> employees.id (ON DELETE CASCADE)
 */
return [
    <<<'SQL'
    CREATE TABLE IF NOT EXISTS departments (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        code       TEXT    NOT NULL UNIQUE,
        name       TEXT    NOT NULL UNIQUE,
        head_id    INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        location   TEXT,
        budget     INTEGER NOT NULL DEFAULT 0,
        created_at TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
    )
    SQL,

    <<<'SQL'
    CREATE TABLE IF NOT EXISTS positions (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        code       TEXT    NOT NULL UNIQUE,
        name       TEXT    NOT NULL UNIQUE,
        level      TEXT    NOT NULL CHECK (level IN ('Manager', 'Senior', 'Specialist', 'Staff')),
        salary_min INTEGER NOT NULL DEFAULT 0,
        salary_max INTEGER NOT NULL DEFAULT 0,
        created_at TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
    )
    SQL,

    <<<'SQL'
    CREATE TABLE IF NOT EXISTS employees (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        nip           TEXT    NOT NULL UNIQUE,
        name          TEXT    NOT NULL,
        email         TEXT    NOT NULL UNIQUE,
        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        position_id   INTEGER REFERENCES positions(id)   ON DELETE SET NULL,
        status        TEXT    NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Cuti', 'Resign')),
        phone         TEXT,
        join_date     TEXT    NOT NULL,
        avatar        TEXT,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT
    )
    SQL,

    <<<'SQL'
    CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id   INTEGER UNIQUE REFERENCES employees(id) ON DELETE SET NULL,
        name          TEXT    NOT NULL,
        email         TEXT    NOT NULL UNIQUE,
        password_hash TEXT    NOT NULL,
        role          TEXT    NOT NULL DEFAULT 'HR Manager',
        created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT
    )
    SQL,

    <<<'SQL'
    CREATE TABLE IF NOT EXISTS attendances (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date        TEXT    NOT NULL,
        check_in    TEXT,
        check_out   TEXT,
        status      TEXT    NOT NULL DEFAULT 'Hadir'
                    CHECK (status IN ('Hadir', 'Terlambat', 'Cuti / Izin', 'Sakit', 'Alpa')),
        location    TEXT,
        notes       TEXT,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT,
        UNIQUE (employee_id, date)
    )
    SQL,

    <<<'SQL'
    CREATE TABLE IF NOT EXISTS leave_requests (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        type        TEXT    NOT NULL CHECK (type IN ('Cuti Tahunan', 'Sakit', 'Izin')),
        start_date  TEXT    NOT NULL,
        end_date    TEXT    NOT NULL,
        reason      TEXT,
        status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT
    )
    SQL,

    'CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id)',
    'CREATE INDEX IF NOT EXISTS idx_employees_position   ON employees(position_id)',
    'CREATE INDEX IF NOT EXISTS idx_attendances_date     ON attendances(date)',
    'CREATE INDEX IF NOT EXISTS idx_attendances_employee ON attendances(employee_id)',
    'CREATE INDEX IF NOT EXISTS idx_leave_status         ON leave_requests(status)',
    'CREATE INDEX IF NOT EXISTS idx_leave_employee       ON leave_requests(employee_id)',
];
