import { Loader2, X } from 'lucide-react';
import ModalError from '../ui/ModalError';

export default function AttendanceModal({
  modal,
  onClose,
  onSubmit,
  saving,
  error,
  employeeDirectory,
}) {
  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
            {modal.mode === 'edit' ? 'Edit Data Absensi' : 'Tambah Data Absensi'}
          </h3>
          <button onClick={onClose} className="text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <ModalError message={error} />
          <div>
            <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Karyawan</label>
            <select required name="employee_id" defaultValue={modal.data?.employee_id ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
              <option value="">- Pilih Karyawan -</option>
              {employeeDirectory.map(k => <option key={k.id} value={k.id}>{k.nama} ({k.nip})</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Tanggal</label>
            <input required name="tanggal" type="date" defaultValue={modal.data?.tanggal ?? new Date().toISOString().slice(0, 10)} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Jam Masuk</label>
              <input name="masuk" type="time" defaultValue={modal.data?.check_in ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Jam Keluar</label>
              <input name="keluar" type="time" defaultValue={modal.data?.check_out ?? ''} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Status Kehadiran</label>
            <select name="status" defaultValue={modal.data?.status ?? 'Hadir'} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100">
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Cuti / Izin">Cuti / Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Alpa">Alpa</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Lokasi / Keterangan</label>
            <input name="lokasi" type="text" defaultValue={modal.data?.lokasi === '-' ? '' : (modal.data?.lokasi ?? '')} placeholder="Kantor Utama (Presensi Web)" className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-800 dark:text-slate-100" />
          </div>
          <div className="pt-3 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">Batal</button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Menyimpan...' : 'Simpan Absensi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
