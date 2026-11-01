import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-2xl text-xs">
      <span className="flex items-center gap-2 font-medium">
        <AlertCircle className="w-4 h-4 shrink-0" /> {message}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
        </button>
      )}
    </div>
  );
}
