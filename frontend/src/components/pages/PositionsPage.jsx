import { Edit, Plus, Trash2 } from 'lucide-react';
import ErrorBanner from '../ui/ErrorBanner';
import { EmptyRow, LoadingRow } from '../ui/TableStates';
import { formatIDR } from '../../utils/format';

export default function PositionsPage({
  jabatanList,
  loading,
  error,
  onRetry,
  onAdd,
  onEdit,
  onDelete,
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Posisi & Jabatan</h2>
          <p className="text-xs text-slate-400">Tingkat level hirarki dan kisaran standar gaji</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jabatan Baru</span>
        </button>
      </div>

      <ErrorBanner message={error} onRetry={onRetry} />

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
              {loading ? (
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
                          onClick={() => onEdit(j)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 transition"
                          title="Edit Jabatan"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete({
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
  );
}
