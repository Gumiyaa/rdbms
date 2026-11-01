import { Loader2 } from 'lucide-react';

export function LoadingRow({ colSpan, label = 'Memuat data...' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-slate-400">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> {label}
        </span>
      </td>
    </tr>
  );
}

export function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-slate-400">
        {children}
      </td>
    </tr>
  );
}
