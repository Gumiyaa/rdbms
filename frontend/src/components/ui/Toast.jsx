import { AlertCircle, CheckCircle } from 'lucide-react';

export default function Toast({ toast }) {
  if (!toast.show) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 animate-bounce">
      {toast.type === 'success' ? (
        <CheckCircle className="w-5 h-5 text-emerald-400" />
      ) : toast.type === 'error' ? (
        <AlertCircle className="w-5 h-5 text-rose-400" />
      ) : (
        <AlertCircle className="w-5 h-5 text-indigo-400" />
      )}
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
}
