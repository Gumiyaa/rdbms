# Smoke test API rdbms (PHP + SQLite)
# Jalankan dari root proyek:  powershell -ExecutionPolicy Bypass -File .\scripts\api-smoke-test.ps1

param(
    [string]$BaseUrl = 'http://rdbms.test/api',
    [string]$Email   = 'admin.hr@company.id',
    [string]$Password = 'admin123'
)

$ErrorActionPreference = 'Stop'
$script:session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$script:pass = 0
$script:fail = 0

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        $Body = $null
    )

    $params = @{
        Uri         = "$BaseUrl/$Path"
        Method      = $Method
        WebSession  = $script:session
        UseBasicParsing = $true
        TimeoutSec  = 20
    }

    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 6)
        $params.ContentType = 'application/json'
    }

    try {
        $response = Invoke-WebRequest @params
        $status = [int] $response.StatusCode
        $content = $response.Content
    } catch {
        $response = $_.Exception.Response
        $status = if ($response) { [int] $response.StatusCode.value__ } else { 0 }
        $content = ''
        if ($response) {
            $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
            $content = $reader.ReadToEnd()
        }
    }

    $json = $null
    if ($content -ne '') {
        try { $json = $content | ConvertFrom-Json } catch { $json = $null }
    }

    return [pscustomobject]@{
        Status  = $status
        Json    = $json
        Content = $content
    }
}

function Assert-True {
    param([bool]$Condition, [string]$Label, [string]$Detail = '')

    if ($Condition) {
        $script:pass++
        Write-Host ("  [PASS] {0}" -f $Label) -ForegroundColor Green
    } else {
        $script:fail++
        Write-Host ("  [FAIL] {0} {1}" -f $Label, $Detail) -ForegroundColor Red
    }
}

Write-Host "`n=== 1. Autentikasi ===" -ForegroundColor Cyan

$anon = Invoke-Api -Method GET -Path 'auth.php?action=me'
Assert-True ($anon.Status -eq 401) 'Akses tanpa login ditolak (401)' "status=$($anon.Status)"

$login = Invoke-Api -Method POST -Path 'auth.php?action=login' -Body @{ email = $Email; password = $Password }
Assert-True ($login.Status -eq 200) 'Login berhasil' "status=$($login.Status) $($login.Content)"
Assert-True ($login.Json.data.user.email -eq $Email) 'Data user sesuai'

$wrong = Invoke-Api -Method POST -Path 'auth.php?action=login' -Body @{ email = $Email; password = 'salah' }
Assert-True ($wrong.Status -eq 401) 'Password salah ditolak (401)' "status=$($wrong.Status)"

$me = Invoke-Api -Method GET -Path 'auth.php?action=me'
Assert-True ($me.Status -eq 200) 'Cek sesi login (200)'

Write-Host "`n=== 2. Dashboard ===" -ForegroundColor Cyan

$dash = Invoke-Api -Method GET -Path 'dashboard.php'
Assert-True ($dash.Status -eq 200) 'GET dashboard' "status=$($dash.Status)"
Assert-True ($dash.Json.data.total_karyawan -gt 0) "Total karyawan = $($dash.Json.data.total_karyawan)"
Assert-True ($dash.Json.data.total_departemen -gt 0) "Total departemen = $($dash.Json.data.total_departemen)"
Assert-True ($dash.Json.data.total_jabatan -gt 0) "Total jabatan = $($dash.Json.data.total_jabatan)"
Assert-True ($dash.Json.data.grafik_mingguan.Count -eq 5) "Grafik mingguan berisi 5 hari"
Assert-True ($dash.Json.data.distribusi_departemen.Count -gt 0) "Distribusi departemen terisi"

Write-Host "`n=== 3. CRUD Karyawan ===" -ForegroundColor Cyan

$list = Invoke-Api -Method GET -Path 'employees.php'
Assert-True ($list.Status -eq 200 -and $list.Json.data.Count -gt 0) "GET employees ($($list.Json.data.Count) data)"

$departments = (Invoke-Api -Method GET -Path 'departments.php').Json.data
$positions = (Invoke-Api -Method GET -Path 'positions.php').Json.data
$deptId = $departments[0].id
$posId = $positions[0].id

$stamp = Get-Date -Format 'HHmmss'
$create = Invoke-Api -Method POST -Path 'employees.php' -Body @{
    nama          = "Test Karyawan $stamp"
    email         = "test.$stamp@company.id"
    departemen_id = $deptId
    jabatan_id    = $posId
    status        = 'Aktif'
    telepon       = '0812-0000-0000'
}
Assert-True ($create.Status -eq 201) 'POST employee (201)' "status=$($create.Status) $($create.Content)"
$newId = $create.Json.data.id
Assert-True ($null -ne $newId -and $create.Json.data.nip -like 'HR-*') "NIP otomatis = $($create.Json.data.nip)"

$detail = Invoke-Api -Method GET -Path "employees.php?id=$newId"
Assert-True ($detail.Status -eq 200 -and $detail.Json.data.id -eq $newId) 'GET detail employee'

$update = Invoke-Api -Method PUT -Path "employees.php?id=$newId" -Body @{ nama = "Test Karyawan Updated $stamp"; status = 'Cuti' }
Assert-True ($update.Status -eq 200 -and $update.Json.data.nama -like 'Test Karyawan Updated*') 'PUT employee (edit)'
Assert-True ($update.Json.data.status -eq 'Cuti') 'Perubahan status tersimpan'

$search = Invoke-Api -Method GET -Path "employees.php?q=Updated%20$stamp"
Assert-True ($search.Json.data.Count -eq 1) "Pencarian karyawan (q) = $($search.Json.data.Count) hasil"

$filter = Invoke-Api -Method GET -Path "employees.php?department_id=$deptId"
Assert-True ($filter.Json.data.Count -ge 1) "Filter department_id = $($filter.Json.data.Count) hasil"

$dup = Invoke-Api -Method POST -Path 'employees.php' -Body @{
    nama  = 'Duplikat'
    email = "test.$stamp@company.id"
}
Assert-True ($dup.Status -eq 422) 'Email duplikat ditolak (422)' "status=$($dup.Status)"

$delete = Invoke-Api -Method DELETE -Path "employees.php?id=$newId"
Assert-True ($delete.Status -eq 200) 'DELETE employee'
Assert-True ((Invoke-Api -Method GET -Path "employees.php?id=$newId").Status -eq 404) 'Karyawan terhapus (404)'

Write-Host "`n=== 4. CRUD Departemen ===" -ForegroundColor Cyan

$createDept = Invoke-Api -Method POST -Path 'departments.php' -Body @{
    nama     = "Riset Test $stamp"
    kepala_id = $null
    lokasi   = 'Lantai 9'
    anggaran = 150000000
}
Assert-True ($createDept.Status -eq 201) 'POST department (201)' "status=$($createDept.Status) $($createDept.Content)"
$deptNewId = $createDept.Json.data.id
Assert-True ($createDept.Json.data.kode -like 'DEPT-*') "Kode otomatis = $($createDept.Json.data.kode)"
Assert-True ($createDept.Json.data.anggaran -eq 'Rp 150 JT') "Format anggaran = $($createDept.Json.data.anggaran)"

$updateDept = Invoke-Api -Method PUT -Path "departments.php?id=$deptNewId" -Body @{ nama = "Riset Updated $stamp"; anggaran = 'Rp 275 JT' }
Assert-True ($updateDept.Status -eq 200 -and $updateDept.Json.data.nama -like 'Riset Updated*') 'PUT department (edit)'
Assert-True ($updateDept.Json.data.anggaran -eq 'Rp 275 JT') 'Anggaran tersimpan'

Assert-True ((Invoke-Api -Method DELETE -Path "departments.php?id=$deptNewId").Status -eq 200) 'DELETE department'

Write-Host "`n=== 5. CRUD Jabatan ===" -ForegroundColor Cyan

$createPos = Invoke-Api -Method POST -Path 'positions.php' -Body @{
    nama    = "QA Engineer Test $stamp"
    level   = 'Staff'
    gajiMin = 6000000
    gajiMax = 9000000
}
Assert-True ($createPos.Status -eq 201) 'POST position (201)' "status=$($createPos.Status) $($createPos.Content)"
$posNewId = $createPos.Json.data.id
Assert-True ($createPos.Json.data.kode -like 'JAB-*') "Kode otomatis = $($createPos.Json.data.kode)"

$updatePos = Invoke-Api -Method PUT -Path "positions.php?id=$posNewId" -Body @{ level = 'Senior'; gajiMax = 12000000 }
Assert-True ($updatePos.Status -eq 200 -and $updatePos.Json.data.level -eq 'Senior') 'PUT position (edit)'

$badPos = Invoke-Api -Method POST -Path 'positions.php' -Body @{ nama = "Bad $stamp"; level = 'Boss'; gajiMin = 100; gajiMax = 50 }
Assert-True ($badPos.Status -eq 422) 'Validasi level & gaji (422)' "status=$($badPos.Status)"

Assert-True ((Invoke-Api -Method DELETE -Path "positions.php?id=$posNewId").Status -eq 200) 'DELETE position'

Write-Host "`n=== 6. CRUD Absensi ===" -ForegroundColor Cyan

$empForAttendance = (Invoke-Api -Method GET -Path 'employees.php').Json.data[0]

$createAtt = Invoke-Api -Method POST -Path 'attendances.php' -Body @{
    employee_id = $empForAttendance.id
    tanggal     = '2030-01-02'
    masuk       = '07:45'
    keluar      = '17:00'
    status      = 'Hadir'
    lokasi      = 'Smoke test'
}
Assert-True ($createAtt.Status -eq 201) 'POST attendance (201)' "status=$($createAtt.Status) $($createAtt.Content)"
$attId = $createAtt.Json.data.id

$updateAtt = Invoke-Api -Method PUT -Path "attendances.php?id=$attId" -Body @{ status = 'Terlambat'; masuk = '08:15' }
Assert-True ($updateAtt.Status -eq 200 -and $updateAtt.Json.data.status -eq 'Terlambat') 'PUT attendance (edit)'

$dupeAtt = Invoke-Api -Method POST -Path 'attendances.php' -Body @{
    employee_id = $empForAttendance.id
    tanggal     = '2030-01-02'
    status      = 'Hadir'
}
Assert-True ($dupeAtt.Status -eq 422) 'Absensi ganda ditolak (422)' "status=$($dupeAtt.Status)"

$attList = Invoke-Api -Method GET -Path 'attendances.php'
Assert-True ($attList.Status -eq 200 -and $attList.Json.meta.summary.total -ge 0) 'GET attendances + summary'
$recap = Invoke-Api -Method GET -Path 'attendances.php?action=recap'
Assert-True ($recap.Status -eq 200 -and $recap.Json.data.data.Count -gt 0) 'GET rekap kehadiran'

Assert-True ((Invoke-Api -Method DELETE -Path "attendances.php?id=$attId").Status -eq 200) 'DELETE attendance'

Write-Host "`n=== 7. Pengajuan Cuti ===" -ForegroundColor Cyan

$createLeave = Invoke-Api -Method POST -Path 'leave_requests.php' -Body @{
    employee_id    = $empForAttendance.id
    jenis          = 'Cuti Tahunan'
    tanggal_mulai  = '2030-02-01'
    tanggal_selesai = '2030-02-03'
    alasan         = 'Smoke test cuti'
}
Assert-True ($createLeave.Status -eq 201) 'POST leave request (201)' "status=$($createLeave.Status) $($createLeave.Content)"
$leaveId = $createLeave.Json.data.id
Assert-True ($createLeave.Json.data.status -eq 'pending') 'Status awal = pending'

$approve = Invoke-Api -Method PUT -Path "leave_requests.php?id=$leaveId" -Body @{ status = 'approved' }
Assert-True ($approve.Status -eq 200 -and $approve.Json.data.status -eq 'approved') 'Approve cuti'

$leaveList = Invoke-Api -Method GET -Path 'leave_requests.php'
Assert-True ($leaveList.Status -eq 200 -and $leaveList.Json.data.Count -gt 0) "GET leave requests ($($leaveList.Json.data.Count) data)"

Assert-True ((Invoke-Api -Method DELETE -Path "leave_requests.php?id=$leaveId").Status -eq 200) 'DELETE leave request'

Write-Host "`n=== 8. Keamanan & Error Handling ===" -ForegroundColor Cyan

$badJson = Invoke-Api -Method POST -Path 'employees.php' -Body 'bukan-json'
Assert-True ($badJson.Status -in @(400, 422)) 'Body tidak valid ditolak' "status=$($badJson.Status)"

$notFound = Invoke-Api -Method GET -Path 'employees.php?id=999999'
Assert-True ($notFound.Status -eq 404) 'Data tidak ditemukan (404)'

$logout = Invoke-Api -Method POST -Path 'auth.php?action=logout'
Assert-True ($logout.Status -eq 200) 'Logout'
Assert-True ((Invoke-Api -Method GET -Path 'auth.php?action=me').Status -eq 401) 'Setelah logout sesi tidak valid (401)'

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host (" HASIL: {0} PASS, {1} FAIL" -f $script:pass, $script:fail) -ForegroundColor $(if ($script:fail -eq 0) { 'Green' } else { 'Red' })
Write-Host "=============================================`n" -ForegroundColor Cyan

if ($script:fail -gt 0) { exit 1 }
