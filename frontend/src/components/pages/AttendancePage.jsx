import { Edit, FileSpreadsheet, Loader2, Plus, Trash2 } from 'lucide-react';
import ErrorBanner from '../ui/ErrorBanner';
import { EmptyRow, LoadingRow } from '../ui/TableStates';

export default function AttendancePage({
  absensiList,
  summary,
  loading,
  error,
  onRetry,
  onAdd,
  onExport,
  exporting,
  onEdit,
  onDelete,
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Log Absensi Karyawan</h2>
          <p className="text-xs text-slate-400">Catatan kehadiran riil waktu dan status presensi hari ini</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={onAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Absensi</span>
          </button>
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>{exporting ? 'Menyiapkan...' : 'Ekspor Laporan (Excel)'}</span>
          </button>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={onRetry} />

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
              {loading ? (
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
                          onClick={() => onEdit(log)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 transition"
                          title="Edit Absensi"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete({
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
  );
}
