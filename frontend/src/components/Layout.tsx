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
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/lib/queries';
import { ProfileModal } from '@/components/ProfileModal';

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

function Sidebar() {
  const { user, logout } = useAuth();
  const { data: alerts } = useAlerts();
  const unread = alerts?.filter((a) => !a.read).length ?? 0;
  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U';
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
          <DollarSign size={18} />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800">FinControl</div>
          <div className="text-[11px] text-slate-400">hub financeiro</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-brand-50 font-medium text-brand'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
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

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex flex-1 items-center gap-2.5 overflow-hidden rounded-lg p-1 text-left hover:bg-slate-50"
            title="Editar perfil / WhatsApp"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand text-sm font-medium text-white">
              {initial}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-1 truncate text-xs font-medium text-slate-700">
                {user?.name}
                <Smartphone
                  size={11}
                  className={user?.phone ? 'text-brand' : 'text-slate-300'}
                  aria-label={user?.phone ? 'WhatsApp vinculado' : 'WhatsApp não vinculado'}
                />
              </div>
              <div className="truncate text-[10px] text-slate-400">{user?.email}</div>
            </div>
          </button>
          <button
            onClick={logout}
            className="flex-shrink-0 text-slate-400 hover:text-red-500"
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
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
          <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
