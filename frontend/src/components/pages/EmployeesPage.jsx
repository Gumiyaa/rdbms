import { Edit, Eye, Search, Trash2, UserPlus } from 'lucide-react';
import ErrorBanner from '../ui/ErrorBanner';
import { EmptyRow, LoadingRow } from '../ui/TableStates';

export default function EmployeesPage({
  karyawanList,
  loading,
  error,
  onRetry,
  totalKaryawan,
  searchQuery,
  onSearchChange,
  deptFilter,
  onDeptFilterChange,
  positionFilter,
  onPositionFilterChange,
  statusFilter,
  onStatusFilterChange,
  departemenList,
  jabatanList,
  onAdd,
  onDetail,
  onEdit,
  onDelete,
}) {
  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Header Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Data Karyawan</h2>
          <p className="text-xs text-slate-400">Kelola informasi seluruh anggota staf perusahaan</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Karyawan Baru</span>
        </button>
      </div>

      <ErrorBanner message={error} onRetry={onRetry} />

      {/* Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari NIP, nama, email..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Departemen Filter */}
          <select
            value={deptFilter}
            onChange={(e) => onDeptFilterChange(e.target.value)}
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
            onChange={(e) => onPositionFilterChange(e.target.value)}
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
            onChange={(e) => onStatusFilterChange(e.target.value)}
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
              {loading ? (
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
                          onClick={() => onDetail(k)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition"
                          title="Detail Karyawan"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(k)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 transition"
                          title="Edit Data"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete({
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
          <span>Menampilkan {karyawanList.length} dari {totalKaryawan} karyawan</span>
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
  );
}
