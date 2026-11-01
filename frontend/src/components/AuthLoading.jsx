import { Building2, Loader2 } from 'lucide-react';

export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 font-sans">
      <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 shadow-lg">
        <Building2 className="w-10 h-10 text-indigo-400" />
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa sesi login...
      </div>
    </div>
  );
}
