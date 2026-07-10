import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  Search,
  Target,
  MessageCircle,
  Tag,
  Wallet,
  Bell,
  DollarSign,
  LogOut,
  Smartphone,
  Menu,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/lib/queries';
import { ProfileModal } from '@/components/ProfileModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PrivacyToggle } from '@/components/PrivacyToggle';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transacoes', label: 'Transações', icon: List },
  { to: '/busca', label: 'Busca', icon: Search },
  { to: '/orcamentos', label: 'Orçamentos', icon: Target },
  { to: '/chat', label: 'Chat WhatsApp', icon: MessageCircle },
  { to: '/categorias', label: 'Categorias', icon: Tag },
  { to: '/contas', label: 'Contas', icon: Wallet },
  { to: '/alertas', label: 'Alertas', icon: Bell },
];

function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const { user, logout } = useAuth();
  const { data: alerts } = useAlerts();
  const unread = alerts?.filter((a) => !a.read).length ?? 0;
  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U';
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 md:static md:z-auto md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
          <DollarSign size={18} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">FinControl</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">hub financeiro</div>
        </div>
        <button
          onClick={onCloseMobile}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 md:hidden"
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-brand-50 font-medium text-brand dark:bg-brand/10'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              )
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {label === 'Alertas' && unread > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                {unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex flex-1 items-center gap-2.5 overflow-hidden rounded-lg p-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Editar perfil / WhatsApp"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand text-sm font-medium text-white">
              {initial}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                {user?.name}
                <Smartphone
                  size={11}
                  className={user?.phone ? 'text-brand' : 'text-slate-300 dark:text-slate-600'}
                  aria-label={user?.phone ? 'WhatsApp vinculado' : 'WhatsApp não vinculado'}
                />
              </div>
              <div className="truncate text-[10px] text-slate-400 dark:text-slate-500">{user?.email}</div>
            </div>
          </button>
          <button
            onClick={logout}
            className="flex-shrink-0 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </aside>
  );
}

export function Layout({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-col gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 md:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="truncate text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <PrivacyToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
