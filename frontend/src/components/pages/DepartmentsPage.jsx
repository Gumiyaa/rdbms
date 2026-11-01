import { Edit, MapPin, Plus, Trash2 } from 'lucide-react';
import ErrorBanner from '../ui/ErrorBanner';

export default function DepartmentsPage({
  departemenList,
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
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Struktur Departemen</h2>
          <p className="text-xs text-slate-400">Daftar unit kerja dan pimpinan departemen perusahaan</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Departemen Baru</span>
        </button>
      </div>

      <ErrorBanner message={error} onRetry={onRetry} />

      {/* Grid Cards Departemen */}
      {loading && departemenList.length === 0 ? (
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
                      onClick={() => onEdit(dept)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 transition"
                      title="Edit Departemen"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete({
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
  );
}
