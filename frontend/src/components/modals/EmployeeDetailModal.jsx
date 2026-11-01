import { X } from 'lucide-react';

export default function EmployeeDetailModal({ karyawan, onClose }) {
  if (!karyawan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <img src={karyawan.avatar} alt={karyawan.nama} className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-indigo-500/20 shadow-md" />
        <div>
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">{karyawan.nama}</h3>
          <p className="text-xs text-indigo-600 font-semibold">{karyawan.jabatan}</p>
          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded mt-1 inline-block">
            {karyawan.nip}
          </span>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-left space-y-2">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Departemen:</span>
            <span className="font-semibold">{karyawan.departemen}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Email:</span>
            <span className="font-semibold">{karyawan.email}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Telepon:</span>
            <span className="font-semibold">{karyawan.telepon}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Tanggal Bergabung:</span>
            <span className="font-semibold">{karyawan.joinDate}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Status:</span>
            <span className="font-semibold">{karyawan.status}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 transition"
        >
          Tutup Profil
        </button>
      </div>
    </div>
  );
}
