import { AlertCircle, Building2, Loader2, Lock, Mail } from 'lucide-react';

export default function LoginPage({ form, setForm, error, loading, onSubmit, onFillDemo }) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Decorative Background Gradients */}
      <div className="absolute top-0 -left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 mb-4 shadow-lg">
          <Building2 className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">SDM Pro HRIS</h2>
        <p className="mt-2 text-sm text-slate-400">Sistem Manajemen Sumber Daya Manusia Terpadu</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 shadow-2xl border border-slate-700/60 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={onSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Alamat Email Work
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  name="email"
                  autoComplete="username"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition"
                  placeholder="name@company.id"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Kata Sandi
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  name="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-700 rounded bg-slate-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-slate-300">
                  Ingat Saya
                </label>
              </div>
              <a href="#" className="font-medium text-indigo-400 hover:text-indigo-300">
                Lupa sandi?
              </a>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Memproses...' : 'Masuk ke Portal HRIS'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/80 text-center">
            <span className="text-xs text-slate-400">Mode Demonstrasi:</span>
            <button
              type="button"
              onClick={onFillDemo}
              className="mt-2 w-full text-xs bg-slate-700/60 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-lg py-2 transition"
            >
              🚀 Isi Akun Demo (admin.hr@company.id / admin123)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
