import { Check, Plus, Trash2, X } from 'lucide-react';
import ErrorBanner from '../ui/ErrorBanner';
import { EmptyRow, LoadingRow } from '../ui/TableStates';

export default function LeavePage({
  leaveList,
  loading,
  error,
  onRetry,
  onAdd,
  onApprove,
  onReject,
  onDelete,
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Pengajuan Cuti & Izin</h2>
          <p className="text-xs text-slate-400">Kelola permohonan cuti, sakit, dan izin karyawan</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Ajukan Cuti / Izin</span>
        </button>
      </div>

      <ErrorBanner message={error} onRetry={onRetry} />

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
              {loading ? (
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
                          onClick={() => onApprove(leave)}
                          disabled={leave.status === 'approved'}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Setujui"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onReject(leave)}
                          disabled={leave.status === 'rejected'}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Tolak"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete({
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
  );
}
