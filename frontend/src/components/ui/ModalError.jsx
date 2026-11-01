import { AlertCircle } from 'lucide-react';

export default function ModalError({ message }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-3 py-2 rounded-xl">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
