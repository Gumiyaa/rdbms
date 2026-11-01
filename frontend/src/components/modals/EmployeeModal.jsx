import { Loader2, X } from 'lucide-react';
import ModalError from '../ui/ModalError';

export default function EmployeeModal({
  modal,
  onClose,
  onSubmit,
  saving,
  error,
  departemenList,
  jabatanList,
}) {
  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
            {modal.mode === 'edit' ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <ModalError message={error} />
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Nama Lengkap</label>
            <input required name="nama" type="text" defaultValue={modal.data?.nama ?? ''} placeholder="Contoh: Raymond Hartanto" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Email Perusahaan</label>
            <input required name="email" type="email" defaultValue={modal.data?.email ?? ''} placeholder="raymond@company.id" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Departemen</label>
              <select name="departemen_id" defaultValue={modal.data?.departemen_id ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                <option value="">- Tanpa Departemen -</option>
                {departemenList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Jabatan</label>
              <select name="jabatan_id" defaultValue={modal.data?.jabatan_id ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                <option value="">- Tanpa Jabatan -</option>
                {jabatanList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Status Karyawan</label>
              <select name="status" defaultValue={modal.data?.status ?? 'Aktif'} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
                <option value="Aktif">Aktif</option>
                <option value="Cuti">Cuti</option>
                <option value="Resign">Resign</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Tanggal Bergabung</label>
              <input name="join_date" type="date" defaultValue={modal.data?.joinDate ?? new Date().toISOString().slice(0, 10)} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
            </div>
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Nomor Telepon</label>
            <input name="telepon" type="text" defaultValue={modal.data?.telepon ?? ''} placeholder="0812-xxxx-xxxx" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
          </div>
          <div className="pt-3 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
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
  );
}
