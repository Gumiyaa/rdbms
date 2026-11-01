import { Loader2, Trash2 } from 'lucide-react';

export default function DeleteConfirmModal({ target, onClose, onConfirm, saving }) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Hapus Data?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {target.label} akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}
