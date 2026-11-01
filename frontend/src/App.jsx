import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CalendarCheck,
  CalendarDays,
} from 'lucide-react';

import { api, ApiError } from './api/client';
import { DEMO_EMAIL, DEMO_PASSWORD, EMPTY_DASHBOARD, EMPTY_SUMMARY } from './constants';
import { errorText } from './utils/format';
import { useToast } from './hooks/useToast';
import { useHrData } from './hooks/useHrData';
import Toast from './components/ui/Toast';
import AuthLoading from './components/AuthLoading';
import LoginPage from './components/LoginPage';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardPage from './components/pages/DashboardPage';
import EmployeesPage from './components/pages/EmployeesPage';
import DepartmentsPage from './components/pages/DepartmentsPage';
import PositionsPage from './components/pages/PositionsPage';
import AttendancePage from './components/pages/AttendancePage';
import LeavePage from './components/pages/LeavePage';
import EmployeeModal from './components/modals/EmployeeModal';
import DepartmentModal from './components/modals/DepartmentModal';
import PositionModal from './components/modals/PositionModal';
import AttendanceModal from './components/modals/AttendanceModal';
import LeaveModal from './components/modals/LeaveModal';
import EmployeeDetailModal from './components/modals/EmployeeDetailModal';
import DeleteConfirmModal from './components/modals/DeleteConfirmModal';

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
  const { toast, showNotification } = useToast();

  // ------------------------------------------------------------ data layer
  const handleUnauthorized = useCallback(() => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setTodayAttendance(null);
    setLoginError('Sesi Anda telah berakhir. Silakan login kembali.');
  }, []);

  const {
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
  } = useHrData({ isLoggedIn, onUnauthorized: handleUnauthorized, showNotification });

  // ------------------------------------------------------------ auth check
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
    resetData();
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

  // ------------------------------------------------------------ modal openers
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
  const dash = dashboard ?? EMPTY_DASHBOARD;
  const summary = absensiSummary ?? EMPTY_SUMMARY;
  const pendingLeaves = leaveList.filter((leave) => leave.status === 'pending');
  const hasCheckIn = Boolean(todayAttendance?.check_in);
  const hasCheckOut = Boolean(todayAttendance?.check_out);

  // ------------------------------------------------------------ render: auth check
  if (authChecking) {
    return <AuthLoading />;
  }

  // ---------------------------------------------------------------------------
  // RENDER: HALAMAN LOGIN
  // ---------------------------------------------------------------------------
  if (!isLoggedIn) {
    return (
      <LoginPage
        form={loginForm}
        setForm={setLoginForm}
        error={loginError}
        loading={loginLoading}
        onSubmit={handleLoginSubmit}
        onFillDemo={() => {
          setLoginForm({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
          setLoginError('');
        }}
      />
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

      <Toast toast={toast} />

      <Sidebar
        navItems={navItems}
        activeTab={activeTab}
        onSelect={setActiveTab}
        mobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* --------------------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* --------------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">

        <Header
          searchQuery={searchQuery}
          onSearchChange={(value) => {
            setSearchQuery(value);
            setActiveTab('karyawan');
          }}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          onClockToggle={handleClockToggle}
          hasCheckIn={hasCheckIn}
          hasCheckOut={hasCheckOut}
          todayAttendance={todayAttendance}
          notificationOpen={notificationOpen}
          onToggleNotifications={() => setNotificationOpen(!notificationOpen)}
          pendingLeaves={pendingLeaves}
          currentUser={currentUser}
        />

        {/* Content Container */}
        <main className="p-4 sm:p-8 flex-1 max-w-7xl w-full mx-auto space-y-8">

          {activeTab === 'dashboard' && (
            <DashboardPage
              dash={dash}
              loading={loading.dashboard}
              hasDashboard={Boolean(dashboard)}
              error={errors.dashboard}
              currentUser={currentUser}
              onRetry={loadDashboard}
              onAddEmployee={() => openEmployeeModal('create')}
              onOpenAttendance={() => setActiveTab('absensi')}
              onOpenAttendanceLog={() => setActiveTab('absensi')}
            />
          )}

          {activeTab === 'karyawan' && (
            <EmployeesPage
              karyawanList={karyawanList}
              loading={loading.employees}
              error={errors.employees}
              onRetry={loadEmployees}
              totalKaryawan={dash.total_karyawan}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              deptFilter={deptFilter}
              onDeptFilterChange={setDeptFilter}
              positionFilter={positionFilter}
              onPositionFilterChange={setPositionFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              departemenList={departemenList}
              jabatanList={jabatanList}
              onAdd={() => openEmployeeModal('create')}
              onDetail={setSelectedDetailKaryawan}
              onEdit={(k) => openEmployeeModal('edit', k)}
              onDelete={setDeleteTarget}
            />
          )}

          {activeTab === 'departemen' && (
            <DepartmentsPage
              departemenList={departemenList}
              loading={loading.departments}
              error={errors.departments}
              onRetry={loadDepartments}
              onAdd={() => openDeptModal('create')}
              onEdit={(dept) => openDeptModal('edit', dept)}
              onDelete={setDeleteTarget}
            />
          )}

          {activeTab === 'jabatan' && (
            <PositionsPage
              jabatanList={jabatanList}
              loading={loading.positions}
              error={errors.positions}
              onRetry={loadPositions}
              onAdd={() => openJabatanModal('create')}
              onEdit={(j) => openJabatanModal('edit', j)}
              onDelete={setDeleteTarget}
            />
          )}

          {activeTab === 'absensi' && (
            <AttendancePage
              absensiList={absensiList}
              summary={summary}
              loading={loading.attendances}
              error={errors.attendances}
              onRetry={loadAttendances}
              onAdd={() => openAttendanceModal('create')}
              onExport={handleExportAttendance}
              exporting={exportingAttendance}
              onEdit={(log) => openAttendanceModal('edit', log)}
              onDelete={setDeleteTarget}
            />
          )}

          {activeTab === 'cuti' && (
            <LeavePage
              leaveList={leaveList}
              loading={loading.leaves}
              error={errors.leaves}
              onRetry={loadLeaves}
              onAdd={openLeaveModal}
              onApprove={(leave) => handleLeaveStatus(leave, 'approved')}
              onReject={(leave) => handleLeaveStatus(leave, 'rejected')}
              onDelete={setDeleteTarget}
            />
          )}

        </main>
      </div>

      {/* =========================================================================== */}
      {/* MODAL DIALOGS CONTAINER */}
      {/* =========================================================================== */}

      <EmployeeModal
        modal={employeeModal}
        onClose={() => setEmployeeModal(null)}
        onSubmit={handleEmployeeSubmit}
        saving={saving}
        error={modalError}
        departemenList={departemenList}
        jabatanList={jabatanList}
      />

      <DepartmentModal
        modal={deptModal}
        onClose={() => setDeptModal(null)}
        onSubmit={handleDeptSubmit}
        saving={saving}
        error={modalError}
        employeeDirectory={employeeDirectory}
      />

      <PositionModal
        modal={jabatanModal}
        onClose={() => setJabatanModal(null)}
        onSubmit={handleJabatanSubmit}
        saving={saving}
        error={modalError}
      />

      <AttendanceModal
        modal={attendanceModal}
        onClose={() => setAttendanceModal(null)}
        onSubmit={handleAttendanceSubmit}
        saving={saving}
        error={modalError}
        employeeDirectory={employeeDirectory}
      />

      <LeaveModal
        open={leaveModal}
        onClose={() => setLeaveModal(null)}
        onSubmit={handleLeaveSubmit}
        saving={saving}
        error={modalError}
        employeeDirectory={employeeDirectory}
        currentUser={currentUser}
      />

      <EmployeeDetailModal
        karyawan={selectedDetailKaryawan}
        onClose={() => setSelectedDetailKaryawan(null)}
      />

      <DeleteConfirmModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        saving={saving}
      />

    </div>
  );
}
