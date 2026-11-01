import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import { EMPTY_SUMMARY } from '../constants';
import { errorText } from '../utils/format';

/**
 * Sumber data utama aplikasi: daftar karyawan/departemen/jabatan, absensi,
 * cuti, dashboard, filter karyawan, serta status loading & error per resource.
 *
 * Semua loader mempertahankan perilaku lama: setiap request mengisi
 * `loading[key]` dan `errors[key]`, dan error 401 memicu `onUnauthorized`.
 */
export function useHrData({ isLoggedIn, onUnauthorized, showNotification }) {
  // ------------------------------------------------------------ data state
  const [karyawanList, setKaryawanList] = useState([]);
  const [employeeDirectory, setEmployeeDirectory] = useState([]);
  const [departemenList, setDepartemenList] = useState([]);
  const [jabatanList, setJabatanList] = useState([]);
  const [absensiList, setAbsensiList] = useState([]);
  const [absensiSummary, setAbsensiSummary] = useState(EMPTY_SUMMARY);
  const [leaveList, setLeaveList] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  // ------------------------------------------------------------ filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('Semua');
  const [positionFilter, setPositionFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [exportingAttendance, setExportingAttendance] = useState(false);

  const setLoadingKey = useCallback((key, value) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setErrorKey = useCallback((key, value) => {
    setErrors((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApiError = useCallback((err, setMessage) => {
    const message = errorText(err, 'Terjadi kesalahan tak terduga.');

    if (err instanceof ApiError && err.status === 401) {
      onUnauthorized();
      return;
    }

    if (setMessage) setMessage(message);
    showNotification(message, 'error');
  }, [onUnauthorized, showNotification]);

  // ------------------------------------------------------------ loaders
  const employeeQuery = useMemo(() => ({
    q: debouncedSearch.trim() || undefined,
    department_id: deptFilter === 'Semua' ? undefined : deptFilter,
    position_id: positionFilter === 'Semua' ? undefined : positionFilter,
    status: statusFilter === 'Semua' ? undefined : statusFilter,
  }), [debouncedSearch, deptFilter, positionFilter, statusFilter]);

  const loadEmployees = useCallback(async () => {
    setLoadingKey('employees', true);
    setErrorKey('employees', '');
    try {
      const res = await api.employees.list(employeeQuery);
      setKaryawanList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      handleApiError(err, (msg) => setErrorKey('employees', msg));
    } finally {
      setLoadingKey('employees', false);
    }
  }, [employeeQuery, handleApiError, setErrorKey, setLoadingKey]);

  // Daftar karyawan tanpa filter, dipakai untuk dropdown pada modal
  // (absensi, cuti, kepala departemen) agar tidak terpengaruh filter tabel.
  const loadEmployeeDirectory = useCallback(async () => {
    try {
      const res = await api.employees.list();
      setEmployeeDirectory(Array.isArray(res.data) ? res.data : []);
    } catch {
      // Biarkan data terakhir tetap dipakai bila permintaan gagal.
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    setLoadingKey('departments', true);
    setErrorKey('departments', '');
    try {
      const res = await api.departments.list();
      setDepartemenList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      handleApiError(err, (msg) => setErrorKey('departments', msg));
    } finally {
      setLoadingKey('departments', false);
    }
  }, [handleApiError, setErrorKey, setLoadingKey]);

  const loadPositions = useCallback(async () => {
    setLoadingKey('positions', true);
    setErrorKey('positions', '');
    try {
      const res = await api.positions.list();
      setJabatanList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      handleApiError(err, (msg) => setErrorKey('positions', msg));
    } finally {
      setLoadingKey('positions', false);
    }
  }, [handleApiError, setErrorKey, setLoadingKey]);

  const loadAttendances = useCallback(async () => {
    setLoadingKey('attendances', true);
    setErrorKey('attendances', '');
    try {
      const res = await api.attendances.list({ limit: 200 });
      setAbsensiList(Array.isArray(res.data) ? res.data : []);
      setAbsensiSummary(res.meta?.summary ?? EMPTY_SUMMARY);
    } catch (err) {
      handleApiError(err, (msg) => setErrorKey('attendances', msg));
    } finally {
      setLoadingKey('attendances', false);
    }
  }, [handleApiError, setErrorKey, setLoadingKey]);

  const loadLeaves = useCallback(async () => {
    setLoadingKey('leaves', true);
    setErrorKey('leaves', '');
    try {
      const res = await api.leaves.list();
      setLeaveList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      handleApiError(err, (msg) => setErrorKey('leaves', msg));
    } finally {
      setLoadingKey('leaves', false);
    }
  }, [handleApiError, setErrorKey, setLoadingKey]);

  const loadDashboard = useCallback(async () => {
    setLoadingKey('dashboard', true);
    setErrorKey('dashboard', '');
    try {
      const res = await api.dashboard();
      setDashboard(res.data ?? null);
    } catch (err) {
      handleApiError(err, (msg) => setErrorKey('dashboard', msg));
    } finally {
      setLoadingKey('dashboard', false);
    }
  }, [handleApiError, setErrorKey, setLoadingKey]);

  // ------------------------------------------------------------ export
  // Ekspor data absensi langsung dari API (SQLite) ke berkas XLSX.
  const handleExportAttendance = async () => {
    if (exportingAttendance) return;

    setExportingAttendance(true);
    setErrorKey('attendances', '');

    try {
      const res = await api.attendances.list({ limit: 1000 });
      const rows = Array.isArray(res.data) ? res.data : [];

      if (rows.length === 0) {
        showNotification('Tidak ada data absensi untuk diekspor.', 'info');
        return;
      }

      const XLSX = await import('xlsx');

      const data = rows.map((log) => ({
        'Nama Karyawan': log.nama,
        'NIP': log.nip,
        'Tanggal': log.tanggal,
        'Jam Masuk': log.masuk,
        'Jam Keluar': log.keluar,
        'Status Kehadiran': log.status,
        'Departemen': log.departemen,
        'Lokasi / Keterangan': log.lokasi,
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet['!cols'] = [
        { wch: 24 },
        { wch: 14 },
        { wch: 12 },
        { wch: 11 },
        { wch: 11 },
        { wch: 16 },
        { wch: 24 },
        { wch: 30 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Absensi');

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan_Absensi_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showNotification(`Laporan absensi (${rows.length} baris) berhasil diekspor ke Excel (.xlsx).`, 'success');
    } catch (err) {
      handleApiError(err, (msg) => setErrorKey('attendances', msg));
    } finally {
      setExportingAttendance(false);
    }
  };

  // ------------------------------------------------------------ effects
  // Debounce pencarian karyawan (300 ms) agar tidak membanjiri server.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Muat seluruh data setelah login.
  useEffect(() => {
    if (!isLoggedIn) return;
    loadEmployeeDirectory();
    loadDepartments();
    loadPositions();
    loadAttendances();
    loadLeaves();
    loadDashboard();
  }, [isLoggedIn, loadEmployeeDirectory, loadDepartments, loadPositions, loadAttendances, loadLeaves, loadDashboard]);

  // Muat ulang karyawan setiap filter/pencarian berubah.
  useEffect(() => {
    if (!isLoggedIn) return;
    loadEmployees();
  }, [isLoggedIn, loadEmployees]);

  const reloadEverything = useCallback(async () => {
    await Promise.all([
      loadEmployees(),
      loadEmployeeDirectory(),
      loadDepartments(),
      loadPositions(),
      loadAttendances(),
      loadLeaves(),
      loadDashboard(),
    ]);
  }, [loadEmployees, loadEmployeeDirectory, loadDepartments, loadPositions, loadAttendances, loadLeaves, loadDashboard]);

  // Dipakai saat logout agar data sesi sebelumnya tidak tersisa di layar.
  const resetData = useCallback(() => {
    setDashboard(null);
    setKaryawanList([]);
    setEmployeeDirectory([]);
    setDepartemenList([]);
    setJabatanList([]);
    setAbsensiList([]);
    setLeaveList([]);
  }, []);

  return {
    karyawanList,
    employeeDirectory,
    departemenList,
    jabatanList,
    absensiList,
    absensiSummary,
    leaveList,
    dashboard,
    loading,
    errors,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    deptFilter,
    setDeptFilter,
    positionFilter,
    setPositionFilter,
    statusFilter,
    setStatusFilter,
    exportingAttendance,
    loadEmployees,
    loadEmployeeDirectory,
    loadDepartments,
    loadPositions,
    loadAttendances,
    loadLeaves,
    loadDashboard,
    reloadEverything,
    resetData,
    handleExportAttendance,
    handleApiError,
  };
}
