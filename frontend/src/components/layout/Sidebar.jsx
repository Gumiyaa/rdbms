import { Building2, LogOut, X } from 'lucide-react';
import { DEFAULT_AVATAR } from '../../constants';

export default function Sidebar({
  navItems,
  activeTab,
  onSelect,
  mobileOpen,
  onClose,
  currentUser,
  onLogout,
}) {
  return (
    <>
      {/* Overlay Backdrop Mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-slate-800
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Logo Brand */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-white text-base tracking-wide leading-tight">SDM Pro</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">HR Management</span>
              </div>
            </div>
            <button
              className="md:hidden text-slate-400 hover:text-white"
              onClick={onClose}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Profile Mini Card */}
          <div className="m-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
            <img
              src={currentUser?.avatar || DEFAULT_AVATAR}
              alt={currentUser?.name || 'User'}
              className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500"
            />
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.name || 'Administrator'}</p>
              <p className="text-[11px] text-slate-400 truncate">{currentUser?.role || 'HR Manager'}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 space-y-1.5 mt-2">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Navigasi Utama</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-sm font-medium transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>
    </>
  );
}
