<?php

/**
 * Seeder data awal.
 * Hanya dijalankan jika tabel employees masih kosong, sehingga data pengguna
 * tidak pernah tertimpa saat aplikasi dibuka ulang.
 */
function seed_database(PDO $pdo): void
{
    if ((int) $pdo->query('SELECT COUNT(*) FROM employees')->fetchColumn() > 0) {
        return;
    }

    $ownsTransaction = !$pdo->inTransaction();

    if ($ownsTransaction) {
        $pdo->beginTransaction();
    }

    try {
        // ---------------------------------------------------------------- users
        // Akun demo dibuat setelah employee ter-seed (lihat bagian akhir).

        // ---------------------------------------------------------- departments
        $departments = [
            ['DEPT-TI',  'Teknologi Informasi',   'Lantai 4 - Gedung Utama', 450000000],
            ['DEPT-HR',  'Sumber Daya Manusia',   'Lantai 2 - Gedung Utama', 200000000],
            ['DEPT-KEU', 'Keuangan & Akuntansi',  'Lantai 3 - Gedung Utama', 300000000],
            ['DEPT-MKT', 'Pemasaran & Branding',  'Lantai 5 - Gedung Utama', 600000000],
            ['DEPT-OPS', 'Operasional',           'Lantai 1 - Gedung B',     500000000],
            ['DEPT-LOG', 'Logistik & Supply',     'Gudang Pusat - Bekasi',   250000000],
        ];
        $stmt = $pdo->prepare('INSERT INTO departments (code, name, location, budget) VALUES (?, ?, ?, ?)');
        $deptId = [];
        foreach ($departments as $d) {
            $stmt->execute($d);
            $deptId[$d[0]] = (int) $pdo->lastInsertId();
        }

        // ------------------------------------------------------------ positions
        $positions = [
            ['JAB-001', 'Software Engineer Lead',     'Manager',    15000000, 22000000],
            ['JAB-002', 'Senior Frontend Developer',  'Senior',     10000000, 15000000],
            ['JAB-003', 'HR Specialist',              'Specialist',  7000000, 11000000],
            ['JAB-004', 'Financial Analyst',          'Senior',      9000000, 13500000],
            ['JAB-005', 'Digital Marketing Lead',     'Manager',    12000000, 18000000],
            ['JAB-006', 'UI/UX Designer',             'Staff',       6500000, 10000000],
            ['JAB-007', 'Operations Officer',         'Staff',       5500000,  8500000],
            ['JAB-008', 'System Administrator',       'Senior',      9500000, 14000000],
        ];
        $stmt = $pdo->prepare('INSERT INTO positions (code, name, level, salary_min, salary_max) VALUES (?, ?, ?, ?, ?)');
        $posId = [];
        foreach ($positions as $p) {
            $stmt->execute($p);
            $posId[$p[0]] = (int) $pdo->lastInsertId();
        }

        // ------------------------------------------------------------ employees
        $employees = [
            ['HR-2023001', 'Budi Santoso',   'budi.santoso@company.id',  'DEPT-TI',  'JAB-001', 'Aktif', '0812-3456-7890', '2021-03-15', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'],
            ['HR-2023002', 'Siti Rahmawati', 'siti.rahma@company.id',    'DEPT-HR',  'JAB-003', 'Aktif', '0813-9876-5432', '2020-01-10', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'],
            ['HR-2023003', 'Ahmad Hidayat',  'ahmad.hidayat@company.id', 'DEPT-TI',  'JAB-002', 'Cuti',  '0811-2233-4455', '2022-06-01', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'],
            ['HR-2023004', 'Dewi Lestari',   'dewi.lestari@company.id',  'DEPT-KEU', 'JAB-004', 'Aktif', '0815-6677-8899', '2019-11-20', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'],
            ['HR-2023005', 'Rizky Pratama',  'rizky.p@company.id',       'DEPT-OPS', 'JAB-007', 'Aktif', '0817-1122-3344', '2021-09-05', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'],
            ['HR-2023006', 'Anita Wijaya',   'anita.w@company.id',       'DEPT-MKT', 'JAB-005', 'Aktif', '0818-4455-6677', '2022-02-14', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'],
            ['HR-2023007', 'Hendra Kusuma',  'hendra.k@company.id',      'DEPT-KEU', 'JAB-004', 'Aktif', '0819-3344-5566', '2018-04-18', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'],
            ['HR-2023008', 'Maya Putri',     'maya.putri@company.id',    'DEPT-TI',  'JAB-006', 'Aktif', '0812-7788-9900', '2023-01-09', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'],
            ['HR-2023009', 'Farida Nur',     'farida.nur@company.id',    'DEPT-LOG', 'JAB-007', 'Aktif', '0813-5566-7788', '2020-08-17', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'],
        ];
        $stmt = $pdo->prepare(
            'INSERT INTO employees (nip, name, email, department_id, position_id, status, phone, join_date, avatar)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $empId = [];
        foreach ($employees as $e) {
            $stmt->execute([
                $e[0],
                $e[1],
                $e[2],
                $deptId[$e[3]],
                $posId[$e[4]],
                $e[5],
                $e[6],
                $e[7],
                $e[8],
            ]);
            $empId[$e[0]] = (int) $pdo->lastInsertId();
        }

        // ------------------------------------------------------ kepala departemen
        $heads = [
            'DEPT-TI'  => 'HR-2023001',
            'DEPT-HR'  => 'HR-2023002',
            'DEPT-KEU' => 'HR-2023007',
            'DEPT-MKT' => 'HR-2023006',
            'DEPT-OPS' => 'HR-2023005',
            'DEPT-LOG' => 'HR-2023009',
        ];
        $stmt = $pdo->prepare('UPDATE departments SET head_id = ? WHERE id = ?');
        foreach ($heads as $deptCode => $nip) {
            $stmt->execute([$empId[$nip], $deptId[$deptCode]]);
        }

        // ---------------------------------------------------------------- users
        $stmt = $pdo->prepare('INSERT INTO users (employee_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([
            $empId['HR-2023002'],
            'Siti Rahmawati',
            'admin.hr@company.id',
            password_hash('admin123', PASSWORD_DEFAULT),
            'HR Manager',
        ]);

        // ---------------------------------------------------------- attendances
        $nips = array_keys($empId);
        $attendanceStmt = $pdo->prepare(
            'INSERT INTO attendances (employee_id, date, check_in, check_out, status, location, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        $today = date('Y-m-d');

        // Riwayat 5 hari kerja terakhir (untuk grafik mingguan).
        $chartDates = last_workdays(5);
        $statusPattern = [
            'Hadir', 'Hadir', 'Hadir', 'Hadir', 'Hadir',
            'Hadir', 'Hadir', 'Terlambat', 'Cuti / Izin', 'Sakit',
        ];

        foreach ($chartDates as $di => $date) {
            foreach ($nips as $ei => $nip) {
                $status = $statusPattern[($ei * 3 + $di) % count($statusPattern)];
                [$in, $out] = attendance_times($status, $ei, $di);
                $attendanceStmt->execute([
                    $empId[$nip],
                    $date,
                    $in,
                    $out,
                    $status,
                    attendance_location($status, $ei),
                    null,
                ]);
            }
        }

        // Data absensi hari ini (jika hari ini bukan hari kerja, tetap dibuat
        // agar halaman "Log Absensi" dan dashboard punya data aktual hari ini).
        if (!in_array($today, $chartDates, true)) {
            $todayPattern = [
                'HR-2023001' => ['Hadir',     '07:55', '17:02'],
                'HR-2023002' => ['Hadir',     '08:02', '17:00'],
                'HR-2023003' => ['Cuti / Izin', null,  null],
                'HR-2023004' => ['Terlambat', '08:24', '17:15'],
                'HR-2023005' => ['Hadir',     '07:48', '17:05'],
                'HR-2023006' => ['Hadir',     '08:00', '17:00'],
                'HR-2023007' => ['Hadir',     '07:50', '17:10'],
                'HR-2023008' => ['Sakit',     null,    null],
                'HR-2023009' => ['Hadir',     '07:45', '17:00'],
            ];
            foreach ($todayPattern as $nip => [$status, $in, $out]) {
                $attendanceStmt->execute([
                    $empId[$nip],
                    $today,
                    $in,
                    $out,
                    $status,
                    attendance_location($status, 0),
                    null,
                ]);
            }
        }

        // ------------------------------------------------------- leave_requests
        $leaveStmt = $pdo->prepare(
            'INSERT INTO leave_requests (employee_id, type, start_date, end_date, reason, status)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $leaves = [
            ['HR-2023003', 'Cuti Tahunan', date('Y-m-d', strtotime('-1 day')),  date('Y-m-d', strtotime('+2 days')), 'Cuti tahunan bersama keluarga.', 'pending'],
            ['HR-2023008', 'Sakit',        date('Y-m-d', strtotime('-3 days')), date('Y-m-d'),                       'Demam, disertai surat keterangan dokter.', 'approved'],
            ['HR-2023004', 'Izin',         date('Y-m-d', strtotime('+3 days')), date('Y-m-d', strtotime('+4 days')), 'Urusan administrasi keluarga.', 'pending'],
            ['HR-2023005', 'Cuti Tahunan', date('Y-m-d', strtotime('-20 days')), date('Y-m-d', strtotime('-18 days')), 'Liburan akhir tahun.', 'rejected'],
        ];
        foreach ($leaves as [$nip, $type, $start, $end, $reason, $status]) {
            $leaveStmt->execute([$empId[$nip], $type, $start, $end, $reason, $status]);
        }

        if ($ownsTransaction) {
            $pdo->commit();
        }
    } catch (Throwable $e) {
        if ($ownsTransaction && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

/**
 * Mengembalikan 5 hari kerja terakhir (termasuk hari ini bila hari kerja),
 * diurutkan dari yang paling lama.
 */
function last_workdays(int $count): array
{
    $dates = [];
    $cursor = new DateTimeImmutable('today');

    while (count($dates) < $count) {
        if ((int) $cursor->format('N') <= 5) {
            array_unshift($dates, $cursor->format('Y-m-d'));
        }
        $cursor = $cursor->modify('-1 day');
    }

    return $dates;
}

function attendance_times(string $status, int $employeeIndex, int $dayIndex): array
{
    if (in_array($status, ['Cuti / Izin', 'Sakit', 'Alpa'], true)) {
        return [null, null];
    }

    if ($status === 'Terlambat') {
        $minute = 5 + (($employeeIndex * 7 + $dayIndex * 3) % 25);

        return [sprintf('08:%02d', $minute), sprintf('17:%02d', 5 + ($minute % 10))];
    }

    $minute = 40 + (($employeeIndex * 5 + $dayIndex * 2) % 18);

    return [sprintf('07:%02d', $minute), sprintf('17:%02d', ($minute + 2) % 15)];
}

function attendance_location(string $status, int $employeeIndex): string
{
    if ($status === 'Cuti / Izin') {
        return 'Pengajuan Cuti / Izin';
    }

    if ($status === 'Sakit') {
        return 'Surat Keterangan Dokter';
    }

    if ($status === 'Alpa') {
        return 'Tidak ada keterangan';
    }

    if ($employeeIndex % 4 === 3) {
        return 'WFH (Presensi Mobile GPS)';
    }

    return 'Kantor Utama (IP: 192.168.1.' . (10 + $employeeIndex * 9) . ')';
}
