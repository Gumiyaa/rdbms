import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  LogOut,
  Search,
  Bell,
  Plus,
  Filter,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Shield,
  ChevronRight,
  Menu,
  X,
  MapPin,
  Mail,
  Phone,
  Lock,
  ChevronDown,
  Check,
  UserCheck,
  Calendar,
  Grid,
  List,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { api, ApiError } from './api/client';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
const DEMO_EMAIL = 'admin.hr@company.id';
const DEMO_PASSWORD = 'admin123';

const EMPTY_DASHBOARD = {
  total_karyawan: 0,
  total_departemen: 0,
  total_jabatan: 0,
  total_staff: 0,
  karyawan_aktif: 0,
  karyawan_cuti: 0,
  cuti_pending: 0,
  kehadiran_hari_ini: { persen: 0, tepat_waktu: 0, terlambat: 0, total: 0 },
  hari_ini: { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, total: 0 },
  grafik_mingguan: [],
  distribusi_departemen: [],
  aktivitas_terkini: [],
};

const EMPTY_SUMMARY = { tepat_waktu: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, total: 0 };

const errorText = (err, fallback) => {
  if (err instanceof ApiError) {
    if (err.errors && typeof err.errors === 'object') {
      const details = Object.values(err.errors).filter(Boolean).join(' ');
      return details ? `${err.message} ${details}` : err.message;
    }
    return err.message;
  }
  return fallback;
};

function LoadingRow({ colSpan, label = 'Memuat data...' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-slate-400">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> {label}
        </span>
      </td>
    </tr>
  );
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-slate-400">
        {children}
      </td>
    </tr>
  );
}

function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-2xl text-xs">
      <span className="flex items-center gap-2 font-medium">
        <AlertCircle className="w-4 h-4 shrink-0" /> {message}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
        </button>
      )}
    </div>
  );
}

export default function App() {
  // ---------------------------------------------------------------- auth state
  const [authChecking, setAuthChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // ------------------------------------------------------------ navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // ------------------------------------------------------------ modals
  const [employeeModal, setEmployeeModal] = useState(null);
  const [deptModal, setDeptModal] = useState(null);
  const [jabatanModal, setJabatanModal] = useState(null);
  const [attendanceModal, setAttendanceModal] = useState(null);
  const [leaveModal, setLeaveModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedDetailKaryawan, setSelectedDetailKaryawan] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // ------------------------------------------------------------ toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const toastTimer = useRef(null);

  const showNotification = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3500);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const setLoadingKey = useCallback((key, value) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setErrorKey = useCallback((key, value) => {
    setErrors((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApiError = useCallback((err, setMessage) => {
    const message = errorText(err, 'Terjadi kesalahan tak terduga.');

    if (err instanceof ApiError && err.status === 401) {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setTodayAttendance(null);
      setLoginError('Sesi Anda telah berakhir. Silakan login kembali.');
      return;
    }

    if (setMessage) setMessage(message);
    showNotification(message, 'error');
  }, [showNotification]);

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
  // Cek sesi login saat aplikasi pertama kali dibuka.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await api.auth.me();
        if (cancelled) return;
        setCurrentUser(res.data?.user ?? null);
        setTodayAttendance(res.data?.today_attendance ?? null);
        setIsLoggedIn(true);
      } catch {
        if (!cancelled) setIsLoggedIn(false);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  // ------------------------------------------------------------ auth handlers
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await api.auth.login({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });

      setCurrentUser(res.data?.user ?? null);
      setTodayAttendance(res.data?.today_attendance ?? null);
      setIsLoggedIn(true);
      setActiveTab('dashboard');
      showNotification('Berhasil masuk ke Dashboard HRIS!', 'success');
    } catch (err) {
      setLoginError(errorText(err, 'Gagal masuk. Silakan coba lagi.'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Abaikan: sesi lokal tetap dibersihkan.
    }

    setIsLoggedIn(false);
    setCurrentUser(null);
    setTodayAttendance(null);
    setDashboard(null);
    setKaryawanList([]);
    setEmployeeDirectory([]);
    setDepartemenList([]);
    setJabatanList([]);
    setAbsensiList([]);
    setLeaveList([]);
    setActiveTab('dashboard');
    showNotification('Anda telah keluar dari sistem.', 'info');
  };

  const handleClockToggle = async () => {
    const hasCheckIn = Boolean(todayAttendance?.check_in);
    const hasCheckOut = Boolean(todayAttendance?.check_out);

    try {
      if (!hasCheckIn) {
        const res = await api.attendances.clockIn();
        setTodayAttendance(res.data ?? null);
        showNotification(`Absen Masuk Berhasil pada pukul ${res.data?.masuk ?? ''} WIB!`, 'success');
      } else if (!hasCheckOut) {
        const res = await api.attendances.clockOut();
        setTodayAttendance(res.data ?? null);
        showNotification(`Absen Keluar Berhasil pada pukul ${res.data?.keluar ?? ''} WIB!`, 'info');
      } else {
        showNotification('Anda sudah menyelesaikan absen masuk & keluar hari ini.', 'info');
        return;
      }

      loadAttendances();
      loadDashboard();
    } catch (err) {
      handleApiError(err);
    }
  };

  // ------------------------------------------------------------ mutation helpers
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

  const openEmployeeModal = (mode, data = null) => {
    setModalError('');
    setEmployeeModal({ mode, data });
  };

  const openDeptModal = (mode, data = null) => {
    setModalError('');
    setDeptModal({ mode, data });
  };

  const openJabatanModal = (mode, data = null) => {
    setModalError('');
    setJabatanModal({ mode, data });
  };

  const openAttendanceModal = (mode, data = null) => {
    setModalError('');
    setAttendanceModal({ mode, data });
  };

  const openLeaveModal = () => {
    setModalError('');
    setLeaveModal(true);
  };

  // ------------------------------------------------------------ karyawan
  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!employeeModal) return;

    const fd = new FormData(e.target);
    const payload = {
      nama: String(fd.get('nama') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      departemen_id: fd.get('departemen_id') || null,
      jabatan_id: fd.get('jabatan_id') || null,
      telepon: String(fd.get('telepon') || '').trim(),
      status: fd.get('status') || 'Aktif',
      join_date: fd.get('join_date') || undefined,
    };

    setSaving(true);
    setModalError('');

    try {
      if (employeeModal.mode === 'edit') {
        await api.employees.update(employeeModal.data.id, payload);
        showNotification(`Data karyawan "${payload.nama}" berhasil diperbarui!`);
      } else {
        await api.employees.create(payload);
        showNotification(`Karyawan baru "${payload.nama}" berhasil ditambahkan!`);
      }

      setEmployeeModal(null);
      await Promise.all([loadEmployees(), loadEmployeeDirectory(), loadDepartments(), loadPositions(), loadDashboard()]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleApiError(err);
        setEmployeeModal(null);
        return;
      }
      setModalError(errorText(err, 'Gagal menyimpan data karyawan.'));
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------ departemen
  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    if (!deptModal) return;

    const fd = new FormData(e.target);
    const payload = {
      nama: String(fd.get('nama') || '').trim(),
      kepala_id: fd.get('kepala_id') || null,
      lokasi: String(fd.get('lokasi') || '').trim(),
      anggaran: String(fd.get('anggaran') || '').trim(),
    };

    setSaving(true);
    setModalError('');

    try {
      if (deptModal.mode === 'edit') {
        await api.departments.update(deptModal.data.id, payload);
        showNotification(`Departemen "${payload.nama}" berhasil diperbarui!`);
      } else {
        await api.departments.create(payload);
        showNotification(`Departemen "${payload.nama}" berhasil dibuat!`);
      }

      setDeptModal(null);
      await Promise.all([loadDepartments(), loadEmployees(), loadDashboard()]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleApiError(err);
        setDeptModal(null);
        return;
      }
      setModalError(errorText(err, 'Gagal menyimpan departemen.'));
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------ jabatan
  const handleJabatanSubmit = async (e) => {
    e.preventDefault();
    if (!jabatanModal) return;

    const fd = new FormData(e.target);
    const payload = {
      nama: String(fd.get('nama') || '').trim(),
      level: fd.get('level') || 'Staff',
      gajiMin: Number(fd.get('gajiMin') || 0),
      gajiMax: Number(fd.get('gajiMax') || 0),
    };

    setSaving(true);
    setModalError('');

    try {
      if (jabatanModal.mode === 'edit') {
        await api.positions.update(jabatanModal.data.id, payload);
        showNotification(`Jabatan "${payload.nama}" berhasil diperbarui!`);
      } else {
        await api.positions.create(payload);
        showNotification(`Jabatan "${payload.nama}" berhasil ditambahkan!`);
      }

      setJabatanModal(null);
      await Promise.all([loadPositions(), loadEmployees(), loadDashboard()]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleApiError(err);
        setJabatanModal(null);
        return;
      }
      setModalError(errorText(err, 'Gagal menyimpan jabatan.'));
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------ absensi
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!attendanceModal) return;

    const fd = new FormData(e.target);
    const payload = {
      employee_id: fd.get('employee_id') || null,
      tanggal: fd.get('tanggal') || '',
      masuk: String(fd.get('masuk') || '').trim(),
      keluar: String(fd.get('keluar') || '').trim(),
      status: fd.get('status') || 'Hadir',
      lokasi: String(fd.get('lokasi') || '').trim(),
    };

    setSaving(true);
    setModalError('');

    try {
      if (attendanceModal.mode === 'edit') {
        await api.attendances.update(attendanceModal.data.id, payload);
        showNotification('Data absensi berhasil diperbarui!');
      } else {
        await api.attendances.create(payload);
        showNotification('Data absensi berhasil ditambahkan!');
      }

      setAttendanceModal(null);
      await Promise.all([loadAttendances(), loadDashboard()]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleApiError(err);
        setAttendanceModal(null);
        return;
      }
      setModalError(errorText(err, 'Gagal menyimpan data absensi.'));
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------ cuti
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();

    const fd = new FormData(e.target);
    const payload = {
      employee_id: fd.get('employee_id') || null,
      jenis: fd.get('jenis') || 'Cuti Tahunan',
      tanggal_mulai: fd.get('tanggal_mulai') || '',
      tanggal_selesai: fd.get('tanggal_selesai') || '',
      alasan: String(fd.get('alasan') || '').trim(),
    };

    setSaving(true);
    setModalError('');

    try {
      await api.leaves.create(payload);
      showNotification('Pengajuan cuti berhasil dikirim dan menunggu persetujuan.', 'success');
      setLeaveModal(null);
      await Promise.all([loadLeaves(), loadDashboard()]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleApiError(err);
        setLeaveModal(null);
        return;
      }
      setModalError(errorText(err, 'Gagal mengirim pengajuan cuti.'));
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveStatus = async (leave, status) => {
    try {
      await api.leaves.update(leave.id, { status });
      showNotification(
        status === 'approved'
          ? `Pengajuan cuti ${leave.nama} disetujui.`
          : `Pengajuan cuti ${leave.nama} ditolak.`,
        status === 'approved' ? 'success' : 'info'
      );
      await Promise.all([loadLeaves(), loadDashboard()]);
    } catch (err) {
      handleApiError(err);
    }
  };

  // ------------------------------------------------------------ delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);

    try {
      switch (deleteTarget.type) {
        case 'employee':
          await api.employees.remove(deleteTarget.id);
          break;
        case 'department':
          await api.departments.remove(deleteTarget.id);
          break;
        case 'position':
          await api.positions.remove(deleteTarget.id);
          break;
        case 'attendance':
          await api.attendances.remove(deleteTarget.id);
          break;
        case 'leave':
          await api.leaves.remove(deleteTarget.id);
          break;
        default:
          break;
      }

      showNotification(deleteTarget.message, 'info');
      setDeleteTarget(null);
      await reloadEverything();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleApiError(err);
        setDeleteTarget(null);
        return;
      }
      showNotification(errorText(err, 'Gagal menghapus data.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------ helpers
  const formatIDR = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const dash = dashboard ?? EMPTY_DASHBOARD;
  const summary = absensiSummary ?? EMPTY_SUMMARY;
  const pendingLeaves = leaveList.filter((leave) => leave.status === 'pending');
  const hasCheckIn = Boolean(todayAttendance?.check_in);
  const hasCheckOut = Boolean(todayAttendance?.check_out);

  // ------------------------------------------------------------ render: auth check
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 font-sans">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 shadow-lg">
          <Building2 className="w-10 h-10 text-indigo-400" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa sesi login...
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: HALAMAN LOGIN
  // ---------------------------------------------------------------------------
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
        {/* Decorative Background Gradients */}
        <div className="absolute top-0 -left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 mb-4 shadow-lg">
            <Building2 className="w-10 h-10 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">SDM Pro HRIS</h2>
          <p className="mt-2 text-sm text-slate-400">Sistem Manajemen Sumber Daya Manusia Terpadu</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
          <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 shadow-2xl border border-slate-700/60 sm:rounded-2xl sm:px-10">
            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Alamat Email Work
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    name="email"
                    autoComplete="username"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition"
                    placeholder="name@company.id"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Kata Sandi
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    name="password"
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {loginError && (
                <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-700 rounded bg-slate-900"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-slate-300">
                    Ingat Saya
                  </label>
                </div>
                <a href="#" className="font-medium text-indigo-400 hover:text-indigo-300">
                  Lupa sandi?
                </a>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loginLoading ? 'Memproses...' : 'Masuk ke Portal HRIS'}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700/80 text-center">
              <span className="text-xs text-slate-400">Mode Demonstrasi:</span>
              <button
                type="button"
                onClick={() => {
                  setLoginForm({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
                  setLoginError('');
                }}
                className="mt-2 w-full text-xs bg-slate-700/60 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-lg py-2 transition"
              >
                🚀 Isi Akun Demo (admin.hr@company.id / admin123)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // NAVIGATION CONFIGURATION
  // ---------------------------------------------------------------------------
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'karyawan', label: 'Data Karyawan', icon: Users, badge: karyawanList.length },
    { id: 'departemen', label: 'Departemen', icon: Building2, badge: departemenList.length },
    { id: 'jabatan', label: 'Jabatan & Struktur', icon: Briefcase, badge: null },
    { id: 'absensi', label: 'Absensi & Presensi', icon: CalendarCheck, badge: 'Hari ini' },
    { id: 'cuti', label: 'Cuti & Izin', icon: CalendarDays, badge: dash.cuti_pending || null },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans flex flex-col md:flex-row text-slate-800 dark:text-slate-100">

      {/* Toast Notification Container */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 animate-bounce">
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-indigo-400" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* --------------------------------------------------------------------------- */}
      {/* SIDEBAR COMPONENT (Desktop & Mobile Drawer) */}
      {/* --------------------------------------------------------------------------- */}

      {/* Overlay Backdrop Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-slate-800
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Logo Brand */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-white text-base tracking-wide leading-tight">SDM Pro</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">HR Management</span>
              </div>
            </div>
            <button
              className="md:hidden text-slate-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Profile Mini Card */}
          <div className="m-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
            <img
              src={currentUser?.avatar || DEFAULT_AVATAR}
              alt={currentUser?.name || 'User'}
              className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.name || 'Administrator'}</p>
              <p className="text-[11px] text-slate-400 truncate">{currentUser?.role || 'HR Manager'}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 space-y-1.5 mt-2">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Navigasi Utama</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-sm font-medium transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* --------------------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* --------------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">

        {/* Header Superior */}
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative hidden sm:block w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveTab('karyawan');
                }}
                placeholder="Cari karyawan, NIP, dept..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Clock Button */}
            <button
              onClick={handleClockToggle}
              className={`hidden sm:flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm ${
                hasCheckIn
                  ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>
                {hasCheckIn
                  ? (hasCheckOut ? `Absen Lengkap (${todayAttendance.check_in})` : `Sudah Absen (${todayAttendance.check_in})`)
                  : 'Absen Masuk Sekarang'}
              </span>
            </button>

            {/* Notification Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 relative hover:bg-slate-200 transition"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
              </button>

              {/* Popover Notifikasi */}
              {notificationOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Notifikasi SDM</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                      {pendingLeaves.length} Baru
                    </span>
                  </div>
                  <div className="space-y-3 mt-3">
                    {pendingLeaves.slice(0, 2).map((leave) => (
                      <div key={leave.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{leave.nama} mengajukan {leave.jenis.toLowerCase()}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {leave.tanggal_mulai} s.d. {leave.tanggal_selesai} • Menunggu persetujuan
                        </p>
                      </div>
                    ))}
                    {pendingLeaves.length === 0 && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">Tidak ada pengajuan cuti baru</p>
                        <p className="text-[10px] text-slate-400 mt-1">Semua pengajuan sudah ditinjau.</p>
                      </div>
                    )}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">Laporan Absensi Bulanan Siap</p>
                      <p className="text-[10px] text-slate-400 mt-1">Data absensi tersimpan di database SQLite</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Active User Avatar */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
              <img
                src={currentUser?.avatar || DEFAULT_AVATAR}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">{currentUser?.name || 'Administrator'}</p>
                <p className="text-[10px] text-slate-400">{currentUser?.role || 'HR Manager'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="p-4 sm:p-8 flex-1 max-w-7xl w-full mx-auto space-y-8">

          {/* =========================================================================== */}
          {/* VIEW 1: DASHBOARD */}
          {/* =========================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">

              <ErrorBanner message={errors.dashboard} onRetry={loadDashboard} />

              {/* Banner Selamat Datang */}
              <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2 z-10 max-w-xl">
                  <span className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-indigo-100 font-medium inline-block">
                    HRIS Management Console
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Selamat Datang Kembali, {(currentUser?.name || 'Admin').split(' ')[0]}! 👋
                  </h2>
                  <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
                    Sistem mencatat tingkat kehadiran karyawan hari ini mencapai <span className="font-bold underline text-white">{dash.kehadiran_hari_ini.persen}%</span>. Ada {dash.cuti_pending} permohonan izin cuti baru yang perlu disetujui.
                  </p>
                </div>
                <div className="flex gap-3 z-10 w-full md:w-auto">
                  <button
                    onClick={() => openEmployeeModal('create')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold px-4 py-3 rounded-xl text-xs shadow-lg transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Tambah Karyawan</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('absensi')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-900/50 hover:bg-indigo-900 text-white border border-indigo-400/30 font-semibold px-4 py-3 rounded-xl text-xs transition"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    <span>Log Absensi</span>
                  </button>
                </div>
                {/* Background Pattern */}
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
              </div>

              {loading.dashboard && !dashboard ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 flex items-center justify-center gap-2 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Memuat statistik dashboard...
                </div>
              ) : (
                <>
                  {/* Stat Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Total Karyawan</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{dash.total_karyawan}</h3>
                        <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3" /> {dash.karyawan_aktif} aktif
                        </span>
                      </div>
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <Users className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Total Departemen</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{dash.total_departemen}</h3>
                        <span className="text-[11px] text-slate-400 mt-1 block">{dash.total_jabatan} jabatan terdaftar</span>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <Building2 className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Kehadiran Hari Ini</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{dash.kehadiran_hari_ini.persen}%</h3>
                        <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3" /> {dash.kehadiran_hari_ini.tepat_waktu} Tepat Waktu
                        </span>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                        <UserCheck className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Karyawan Cuti / Izin</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{dash.hari_ini.izin + dash.hari_ini.sakit} Orang</h3>
                        <span className="text-[11px] text-amber-500 font-semibold mt-1 block">
                          {dash.hari_ini.sakit} Sakit, {dash.hari_ini.izin} Cuti
                        </span>
                      </div>
                      <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                        <Calendar className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Chart Visualizations & Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Bar Chart Kehadiran Mingguan */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Tren Kehadiran Minggu Ini</h3>
                          <p className="text-xs text-slate-400">Statistik kehadiran karyawan per hari kerja</p>
                        </div>
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-3 py-1 rounded-lg">
                          Minggu Pertama Nov
                        </span>
                      </div>
                      <div className="h-64 w-full">
                        {dash.grafik_mingguan.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dash.grafik_mingguan}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                              />
                              <Bar dataKey="hadir" name="Hadir" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="terlambat" name="Terlambat" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="izin" name="Izin/Cuti" fill="#ec4899" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-slate-400">
                            Belum ada data absensi untuk grafik.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pie Chart Distribusi Departemen */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Distribusi Karyawan</h3>
                        <p className="text-xs text-slate-400 mb-4">Persentase tim per departemen</p>
                        <div className="h-44 w-full relative flex items-center justify-center">
                          {dash.distribusi_departemen.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={dash.distribusi_departemen}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={75}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {dash.distribusi_departemen.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <span className="text-xs text-slate-400">Belum ada data departemen.</span>
                          )}
                          <div className="absolute text-center pointer-events-none">
                            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{dash.total_karyawan}</span>
                            <p className="text-[10px] text-slate-400">Staff Total</p>
                          </div>
                        </div>
                      </div>

                      {/* Legend list */}
                      <div className="space-y-1.5 mt-2 text-xs">
                        {dash.distribusi_departemen.slice(0, 3).map((item) => (
                          <div key={item.id ?? item.name} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                              <span className="truncate max-w-[120px]">{item.name}</span>
                            </div>
                            <span className="font-semibold">{item.value} org</span>
                          </div>
                        ))}
                        {dash.distribusi_departemen.length === 0 && (
                          <p className="text-slate-400">Belum ada departemen terdaftar.</p>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Log Aktivitas Terkini Table Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Presensi & Activity Terkini</h3>
                      <button onClick={() => setActiveTab('absensi')} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        Lihat Semua Log →
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                            <th className="pb-3">KARYAWAN</th>
                            <th className="pb-3">DEPARTEMEN</th>
                            <th className="pb-3">WAKTU MASUK</th>
                            <th className="pb-3">STATUS HASIL</th>
                            <th className="pb-3">LOKASI PRESENSI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {dash.aktivitas_terkini.length > 0 ? (
                            dash.aktivitas_terkini.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                <td className="py-3 font-semibold text-slate-700 dark:text-slate-200">{row.nama}</td>
                                <td className="py-3 text-slate-500">{row.departemen}</td>
                                <td className="py-3 text-slate-600 dark:text-slate-300 font-mono">{row.masuk} WIB</td>
                                <td className="py-3">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    row.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                                    row.status === 'Terlambat' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                                    'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                                  }`}>
                                    {row.status}
                                  </span>
                                </td>
                                <td className="py-3 text-slate-400">{row.lokasi}</td>
                              </tr>
                            ))
                          ) : (
                            <EmptyRow colSpan={5}>Belum ada aktivitas presensi hari ini.</EmptyRow>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

          {/* =========================================================================== */}
          {/* VIEW 2: DATA KARYAWAN */}
          {/* =========================================================================== */}
          {activeTab === 'karyawan' && (
            <div className="space-y-6 animate-fadeIn">

              {/* Header Title & Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Data Karyawan</h2>
                  <p className="text-xs text-slate-400">Kelola informasi seluruh anggota staf perusahaan</p>
                </div>
                <button
                  onClick={() => openEmployeeModal('create')}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Karyawan Baru</span>
                </button>
              </div>

              <ErrorBanner message={errors.employees} onRetry={loadEmployees} />

              {/* Filter Controls Bar */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari NIP, nama, email..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  {/* Departemen Filter */}
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Semua">Semua Departemen</option>
                    {departemenList.map(d => (
                      <option key={d.id} value={d.id}>{d.nama}</option>
                    ))}
                  </select>

                  {/* Jabatan Filter */}
                  <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Semua">Semua Jabatan</option>
                    {jabatanList.map(j => (
                      <option key={j.id} value={j.id}>{j.nama}</option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Resign">Resign</option>
                  </select>
                </div>
              </div>

              {/* Table Data Karyawan */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-semibold border-b border-slate-200/60 dark:border-slate-800 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-6">NIP & FOTO</th>
                        <th className="py-3.5 px-6">NAMA & EMAIL</th>
                        <th className="py-3.5 px-6">DEPARTEMEN</th>
                        <th className="py-3.5 px-6">JABATAN</th>
                        <th className="py-3.5 px-6">STATUS</th>
                        <th className="py-3.5 px-6 text-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading.employees ? (
                        <LoadingRow colSpan={6} label="Memuat data karyawan..." />
                      ) : karyawanList.length > 0 ? (
                        karyawanList.map((k) => (
                          <tr key={k.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3.5 px-6 font-mono text-slate-500 font-semibold">
                              <div className="flex items-center gap-3">
                                <img src={k.avatar} alt={k.nama} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                                <span>{k.nip}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6">
                              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{k.nama}</p>
                              <p className="text-[11px] text-slate-400">{k.email}</p>
                            </td>
                            <td className="py-3.5 px-6 font-medium text-slate-600 dark:text-slate-300">{k.departemen}</td>
                            <td className="py-3.5 px-6 text-slate-500">{k.jabatan}</td>
                            <td className="py-3.5 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                k.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                                k.status === 'Cuti' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {k.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedDetailKaryawan(k)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                  title="Detail Karyawan"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEmployeeModal('edit', k)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 transition"
                                  title="Edit Data"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({
                                    type: 'employee',
                                    id: k.id,
                                    label: `${k.nama} (${k.nip})`,
                                    message: `Karyawan ${k.nama} telah dihapus.`,
                                  })}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition"
                                  title="Hapus Karyawan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <EmptyRow colSpan={6}>
                          Tidak ditemukan data karyawan yang sesuai dengan kriteria pencarian.
                        </EmptyRow>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Menampilkan {karyawanList.length} dari {dash.total_karyawan} karyawan</span>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-100 transition">
                      Sebelumnya
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition">
                      1
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-100 transition">
                      Selanjutnya
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================== */}
          {/* VIEW 3: DEPARTEMEN */}
          {/* =========================================================================== */}
          {activeTab === 'departemen' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Struktur Departemen</h2>
                  <p className="text-xs text-slate-400">Daftar unit kerja dan pimpinan departemen perusahaan</p>
                </div>
                <button
                  onClick={() => openDeptModal('create')}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Departemen Baru</span>
                </button>
              </div>

              <ErrorBanner message={errors.departments} onRetry={loadDepartments} />

              {/* Grid Cards Departemen */}
              {loading.departments && departemenList.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm animate-pulse space-y-3">
                      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : departemenList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-10 text-center text-xs text-slate-400">
                  Belum ada departemen. Klik "Tambah Departemen Baru" untuk membuat unit kerja pertama.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {departemenList.map((dept) => (
                    <div key={dept.id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            {dept.kode}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-400">{dept.anggota} Anggota</span>
                            <button
                              onClick={() => openDeptModal('edit', dept)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 transition"
                              title="Edit Departemen"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({
                                type: 'department',
                                id: dept.id,
                                label: dept.nama,
                                message: `Departemen ${dept.nama} telah dihapus.`,
                              })}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition"
                              title="Hapus Departemen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{dept.nama}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-4">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {dept.lokasi}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Kepala Departemen:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{dept.kepala}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Alokasi Anggaran:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{dept.anggaran}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================== */}
          {/* VIEW 4: JABATAN */}
          {/* =========================================================================== */}
          {activeTab === 'jabatan' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Posisi & Jabatan</h2>
                  <p className="text-xs text-slate-400">Tingkat level hirarki dan kisaran standar gaji</p>
                </div>
                <button
                  onClick={() => openJabatanModal('create')}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Jabatan Baru</span>
                </button>
              </div>

              <ErrorBanner message={errors.positions} onRetry={loadPositions} />

              {/* Tabel Jabatan */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-semibold border-b border-slate-200/60 dark:border-slate-800 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-6">KODE & JABATAN</th>
                        <th className="py-3.5 px-6">LEVEL HIRARKI</th>
                        <th className="py-3.5 px-6">ESTIMASI KISARAN GAJI</th>
                        <th className="py-3.5 px-6">PEMEGANG JABATAN</th>
                        <th className="py-3.5 px-6 text-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading.positions ? (
                        <LoadingRow colSpan={5} label="Memuat data jabatan..." />
                      ) : jabatanList.length > 0 ? (
                        jabatanList.map((j) => (
                          <tr key={j.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3.5 px-6">
                              <span className="font-mono text-[10px] text-slate-400 block">{j.kode}</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{j.nama}</span>
                            </td>
                            <td className="py-3.5 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                j.level === 'Manager' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' :
                                j.level === 'Senior' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {j.level}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatIDR(j.gajiMin)} - {formatIDR(j.gajiMax)}
                            </td>
                            <td className="py-3.5 px-6 font-medium text-slate-600 dark:text-slate-300">
                              {j.pemegang} Orang Staff
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openJabatanModal('edit', j)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 transition"
                                  title="Edit Jabatan"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({
                                    type: 'position',
                                    id: j.id,
                                    label: j.nama,
                                    message: `Jabatan ${j.nama} telah dihapus.`,
                                  })}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition"
                                  title="Hapus Jabatan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <EmptyRow colSpan={5}>Belum ada data jabatan. Klik "Tambah Jabatan Baru" untuk memulai.</EmptyRow>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================== */}
          {/* VIEW 5: ABSENSI & PRESENSI */}
          {/* =========================================================================== */}
          {activeTab === 'absensi' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Log Absensi Karyawan</h2>
                  <p className="text-xs text-slate-400">Catatan kehadiran riil waktu dan status presensi hari ini</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => openAttendanceModal('create')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Absensi</span>
                  </button>
                  <button
                    onClick={handleExportAttendance}
                    disabled={exportingAttendance}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
                  >
                    {exportingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                    <span>{exportingAttendance ? 'Menyiapkan...' : 'Ekspor Laporan (Excel)'}</span>
                  </button>
                </div>
              </div>

              <ErrorBanner message={errors.attendances} onRetry={loadAttendances} />

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Hadir Tepat Waktu</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{summary.tepat_waktu} Staff</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Terlambat</p>
                  <p className="text-xl font-bold text-amber-500 mt-1">{summary.terlambat} Staff</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Izin / Cuti</p>
                  <p className="text-xl font-bold text-indigo-500 mt-1">{summary.izin + summary.sakit} Staff</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Tanpa Keterangan (Alpa)</p>
                  <p className="text-xl font-bold text-rose-500 mt-1">{summary.alpa} Staff</p>
                </div>
              </div>

              {/* Log Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-semibold border-b border-slate-200/60 dark:border-slate-800 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-6">TANGGAL</th>
                        <th className="py-3.5 px-6">NIP & KARYAWAN</th>
                        <th className="py-3.5 px-6">JAM MASUK</th>
                        <th className="py-3.5 px-6">JAM KELUAR</th>
                        <th className="py-3.5 px-6">STATUS</th>
                        <th className="py-3.5 px-6">LOKASI / KETERANGAN</th>
                        <th className="py-3.5 px-6 text-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading.attendances ? (
                        <LoadingRow colSpan={7} label="Memuat log absensi..." />
                      ) : absensiList.length > 0 ? (
                        absensiList.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3.5 px-6 text-slate-500 font-mono">{log.tanggal}</td>
                            <td className="py-3.5 px-6">
                              <p className="font-bold text-slate-800 dark:text-slate-100">{log.nama}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{log.nip}</p>
                            </td>
                            <td className="py-3.5 px-6 font-mono font-semibold text-slate-700 dark:text-slate-200">{log.masuk}</td>
                            <td className="py-3.5 px-6 font-mono text-slate-500">{log.keluar}</td>
                            <td className="py-3.5 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                log.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                                log.status === 'Terlambat' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                                'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-slate-500">{log.lokasi}</td>
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openAttendanceModal('edit', log)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 transition"
                                  title="Edit Absensi"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({
                                    type: 'attendance',
                                    id: log.id,
                                    label: `${log.nama} - ${log.tanggal}`,
                                    message: `Data absensi ${log.nama} (${log.tanggal}) telah dihapus.`,
                                  })}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition"
                                  title="Hapus Absensi"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <EmptyRow colSpan={7}>Belum ada data absensi yang tercatat.</EmptyRow>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================== */}
          {/* VIEW 6: CUTI & IZIN */}
          {/* =========================================================================== */}
          {activeTab === 'cuti' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Pengajuan Cuti & Izin</h2>
                  <p className="text-xs text-slate-400">Kelola permohonan cuti, sakit, dan izin karyawan</p>
                </div>
                <button
                  onClick={openLeaveModal}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajukan Cuti / Izin</span>
                </button>
              </div>

              <ErrorBanner message={errors.leaves} onRetry={loadLeaves} />

              {/* Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Menunggu Persetujuan</p>
                  <p className="text-xl font-bold text-amber-500 mt-1">{leaveList.filter((l) => l.status === 'pending').length} Pengajuan</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Disetujui</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{leaveList.filter((l) => l.status === 'approved').length} Pengajuan</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Ditolak</p>
                  <p className="text-xl font-bold text-rose-500 mt-1">{leaveList.filter((l) => l.status === 'rejected').length} Pengajuan</p>
                </div>
              </div>

              {/* Tabel Pengajuan Cuti */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-semibold border-b border-slate-200/60 dark:border-slate-800 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-6">TANGGAL</th>
                        <th className="py-3.5 px-6">KARYAWAN</th>
                        <th className="py-3.5 px-6">JENIS</th>
                        <th className="py-3.5 px-6">ALASAN</th>
                        <th className="py-3.5 px-6">STATUS</th>
                        <th className="py-3.5 px-6 text-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading.leaves ? (
                        <LoadingRow colSpan={6} label="Memuat pengajuan cuti..." />
                      ) : leaveList.length > 0 ? (
                        leaveList.map((leave) => (
                          <tr key={leave.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3.5 px-6 text-slate-500 font-mono">
                              <span className="block">{leave.tanggal_mulai}</span>
                              <span className="block text-[10px] text-slate-400">s.d. {leave.tanggal_selesai}</span>
                            </td>
                            <td className="py-3.5 px-6">
                              <p className="font-bold text-slate-800 dark:text-slate-100">{leave.nama}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{leave.nip} • {leave.departemen}</p>
                            </td>
                            <td className="py-3.5 px-6 font-medium text-slate-600 dark:text-slate-300">{leave.jenis}</td>
                            <td className="py-3.5 px-6 text-slate-500 max-w-[240px] truncate" title={leave.alasan}>{leave.alasan || '-'}</td>
                            <td className="py-3.5 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                                leave.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                              }`}>
                                {leave.status === 'approved' ? 'Disetujui' : leave.status === 'rejected' ? 'Ditolak' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleLeaveStatus(leave, 'approved')}
                                  disabled={leave.status === 'approved'}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Setujui"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleLeaveStatus(leave, 'rejected')}
                                  disabled={leave.status === 'rejected'}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Tolak"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({
                                    type: 'leave',
                                    id: leave.id,
                                    label: `${leave.nama} - ${leave.tanggal_mulai}`,
                                    message: `Pengajuan cuti ${leave.nama} telah dihapus.`,
                                  })}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition"
                                  title="Hapus Pengajuan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <EmptyRow colSpan={6}>Belum ada pengajuan cuti. Klik "Ajukan Cuti / Izin" untuk membuat pengajuan.</EmptyRow>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* =========================================================================== */}
      {/* MODAL DIALOGS CONTAINER */}
      {/* =========================================================================== */}

      {/* MODAL 1: Tambah / Edit Karyawan */}
      {employeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                {employeeModal.mode === 'edit' ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button onClick={() => setEmployeeModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEmployeeSubmit} className="space-y-3 text-xs">
              {modalError && (
                <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-3 py-2 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Nama Lengkap</label>
                <input required name="nama" type="text" defaultValue={employeeModal.data?.nama ?? ''} placeholder="Contoh: Raymond Hartanto" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Email Perusahaan</label>
                <input required name="email" type="email" defaultValue={employeeModal.data?.email ?? ''} placeholder="raymond@company.id" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Departemen</label>
                  <select name="departemen_id" defaultValue={employeeModal.data?.departemen_id ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                    <option value="">- Tanpa Departemen -</option>
                    {departemenList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Jabatan</label>
                  <select name="jabatan_id" defaultValue={employeeModal.data?.jabatan_id ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                    <option value="">- Tanpa Jabatan -</option>
                    {jabatanList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Status Karyawan</label>
                  <select name="status" defaultValue={employeeModal.data?.status ?? 'Aktif'} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Resign">Resign</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Tanggal Bergabung</label>
                  <input name="join_date" type="date" defaultValue={employeeModal.data?.joinDate ?? new Date().toISOString().slice(0, 10)} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Nomor Telepon</label>
                <input name="telepon" type="text" defaultValue={employeeModal.data?.telepon ?? ''} placeholder="0812-xxxx-xxxx" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
              </div>
              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setEmployeeModal(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Tambah / Edit Departemen */}
      {deptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                {deptModal.mode === 'edit' ? 'Edit Departemen' : 'Tambah Departemen'}
              </h3>
              <button onClick={() => setDeptModal(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleDeptSubmit} className="space-y-3 text-xs">
              {modalError && (
                <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-3 py-2 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Nama Departemen</label>
                <input required name="nama" type="text" defaultValue={deptModal.data?.nama ?? ''} placeholder="Contoh: Riset & Pengembangan" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Kepala Departemen</label>
                <select name="kepala_id" defaultValue={deptModal.data?.kepala_id ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                  <option value="">- Belum ditentukan -</option>
                  {employeeDirectory.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Lokasi Gedung / Ruangan</label>
                <input required name="lokasi" type="text" defaultValue={deptModal.data?.lokasi ?? ''} placeholder="Lantai 6 - Gedung Utama" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Alokasi Anggaran</label>
                <input name="anggaran" type="text" defaultValue={deptModal.data?.anggaran_nilai ?? ''} placeholder="450000000 atau Rp 450 JT" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
              </div>
              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setDeptModal(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {deptModal.mode === 'edit' ? 'Simpan Perubahan' : 'Buat Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Tambah / Edit Jabatan */}
      {jabatanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                {jabatanModal.mode === 'edit' ? 'Edit Jabatan' : 'Tambah Jabatan'}
              </h3>
              <button onClick={() => setJabatanModal(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleJabatanSubmit} className="space-y-3 text-xs">
              {modalError && (
                <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-3 py-2 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Nama Jabatan</label>
                <input required name="nama" type="text" defaultValue={jabatanModal.data?.nama ?? ''} placeholder="Contoh: QA Engineer" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Level Hirarki</label>
                <select name="level" defaultValue={jabatanModal.data?.level ?? 'Staff'} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                  <option value="Manager">Manager</option>
                  <option value="Senior">Senior</option>
                  <option value="Specialist">Specialist</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Gaji Minimum (Rp)</label>
                  <input required name="gajiMin" type="number" min="0" step="100000" defaultValue={jabatanModal.data?.gajiMin ?? 5000000} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Gaji Maksimum (Rp)</label>
                  <input required name="gajiMax" type="number" min="0" step="100000" defaultValue={jabatanModal.data?.gajiMax ?? 8000000} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
                </div>
              </div>
              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setJabatanModal(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Menyimpan...' : 'Simpan Jabatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Tambah / Edit Absensi */}
      {attendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                {attendanceModal.mode === 'edit' ? 'Edit Data Absensi' : 'Tambah Data Absensi'}
              </h3>
              <button onClick={() => setAttendanceModal(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAttendanceSubmit} className="space-y-3 text-xs">
              {modalError && (
                <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-3 py-2 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Karyawan</label>
                <select required name="employee_id" defaultValue={attendanceModal.data?.employee_id ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                  <option value="">- Pilih Karyawan -</option>
                  {employeeDirectory.map(k => <option key={k.id} value={k.id}>{k.nama} ({k.nip})</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Tanggal</label>
                <input required name="tanggal" type="date" defaultValue={attendanceModal.data?.tanggal ?? new Date().toISOString().slice(0, 10)} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Jam Masuk</label>
                  <input name="masuk" type="time" defaultValue={attendanceModal.data?.check_in ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Jam Keluar</label>
                  <input name="keluar" type="time" defaultValue={attendanceModal.data?.check_out ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Status Kehadiran</label>
                <select name="status" defaultValue={attendanceModal.data?.status ?? 'Hadir'} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                  <option value="Hadir">Hadir</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Cuti / Izin">Cuti / Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Alpa">Alpa</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Lokasi / Keterangan</label>
                <input name="lokasi" type="text" defaultValue={attendanceModal.data?.lokasi === '-' ? '' : (attendanceModal.data?.lokasi ?? '')} placeholder="Kantor Utama (Presensi Web)" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
              </div>
              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setAttendanceModal(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Menyimpan...' : 'Simpan Absensi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Ajukan Cuti / Izin */}
      {leaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Ajukan Cuti / Izin</h3>
              <button onClick={() => setLeaveModal(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleLeaveSubmit} className="space-y-3 text-xs">
              {modalError && (
                <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-3 py-2 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Karyawan</label>
                <select required name="employee_id" defaultValue={currentUser?.employee_id ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                  <option value="">- Pilih Karyawan -</option>
                  {employeeDirectory.map(k => <option key={k.id} value={k.id}>{k.nama} ({k.nip})</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Jenis Pengajuan</label>
                <select name="jenis" defaultValue="Cuti Tahunan" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                  <option value="Cuti Tahunan">Cuti Tahunan</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Izin">Izin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Tanggal Mulai</label>
                  <input required name="tanggal_mulai" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Tanggal Selesai</label>
                  <input required name="tanggal_selesai" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Alasan Pengajuan</label>
                <textarea name="alasan" rows="3" placeholder="Jelaskan alasan pengajuan cuti / izin..." className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100 resize-none"></textarea>
              </div>
              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setLeaveModal(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Detail Karyawan Card */}
      {selectedDetailKaryawan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 relative">
            <button onClick={() => setSelectedDetailKaryawan(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>

            <img src={selectedDetailKaryawan.avatar} alt={selectedDetailKaryawan.nama} className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-indigo-500/20 shadow-md" />
            <div>
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">{selectedDetailKaryawan.nama}</h3>
              <p className="text-xs text-indigo-600 font-semibold">{selectedDetailKaryawan.jabatan}</p>
              <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded mt-1 inline-block">
                {selectedDetailKaryawan.nip}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-left space-y-2">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Departemen:</span>
                <span className="font-semibold">{selectedDetailKaryawan.departemen}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Email:</span>
                <span className="font-semibold">{selectedDetailKaryawan.email}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Telepon:</span>
                <span className="font-semibold">{selectedDetailKaryawan.telepon}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Tanggal Bergabung:</span>
                <span className="font-semibold">{selectedDetailKaryawan.joinDate}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold">{selectedDetailKaryawan.status}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedDetailKaryawan(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 transition"
            >
              Tutup Profil
            </button>
          </div>
        </div>
      )}

      {/* MODAL 7: Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Hapus Data?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {deleteTarget.label} akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

