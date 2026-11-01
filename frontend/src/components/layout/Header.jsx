import { Bell, Clock, Menu, Search } from 'lucide-react';
import { DEFAULT_AVATAR } from '../../constants';

export default function Header({
  searchQuery,
  onSearchChange,
  onOpenMenu,
  onClockToggle,
  hasCheckIn,
  hasCheckOut,
  todayAttendance,
  notificationOpen,
  onToggleNotifications,
  pendingLeaves,
  currentUser,
}) {
  return (
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMenu}
          className="md:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative hidden sm:block w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari karyawan, NIP, dept..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Clock Button */}
        <button
          onClick={onClockToggle}
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
            onClick={onToggleNotifications}
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
  );
}
