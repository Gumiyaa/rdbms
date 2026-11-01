import {
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle,
  Loader2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ErrorBanner from '../ui/ErrorBanner';
import { EmptyRow } from '../ui/TableStates';

export default function DashboardPage({
  dash,
  loading,
  hasDashboard,
  error,
  currentUser,
  onRetry,
  onAddEmployee,
  onOpenAttendance,
  onOpenAttendanceLog,
}) {
  return (
    <div className="space-y-8 animate-fadeIn">

      <ErrorBanner message={error} onRetry={onRetry} />

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
            onClick={onAddEmployee}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold px-4 py-3 rounded-xl text-xs shadow-lg transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Karyawan</span>
          </button>
          <button
            onClick={onOpenAttendance}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-900/50 hover:bg-indigo-900 text-white border border-indigo-400/30 font-semibold px-4 py-3 rounded-xl text-xs transition"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Log Absensi</span>
          </button>
        </div>
        {/* Background Pattern */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {loading && !hasDashboard ? (
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
              <button onClick={onOpenAttendanceLog} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
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
  );
}
