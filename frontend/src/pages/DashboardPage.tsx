import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  MessageCircle,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { MonthSelector } from '@/components/MonthSelector';
import { Card, Spinner, Badge, Button } from '@/components/ui';
import { categoryIcon } from '@/lib/icons';
import { formatBRL, formatDate, currentMonth, daysRemainingInThisMonth } from '@/lib/format';
import { useSummary, useBudgets, useTransactions, useAlerts } from '@/lib/queries';
import { useTheme } from '@/context/ThemeContext';

function Kpi({
  label,
  value,
  icon,
  color,
  hint,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-semibold" style={{ color }}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{hint}</div>}
    </Card>
  );
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [month, setMonth] = useState(currentMonth());
  const summary = useSummary(month);
  const budgets = useBudgets(month);
  const recent = useTransactions({ limit: 6 });
  const alerts = useAlerts();

  const s = summary.data;
  const unreadAlert = alerts.data?.find((a) => !a.read);
  const chartData =
    s?.daily.map((d) => ({ day: d.date.slice(8, 10), expense: d.expense })) ?? [];

  // Ritmo de gasto só faz sentido para o mês corrente.
  const isCurrentMonth = month === currentMonth();
  const paceHint =
    isCurrentMonth && s
      ? s.balance <= 0
        ? 'sem margem esse mês'
        : `≈ ${formatBRL(s.balance / daysRemainingInThisMonth())}/dia até o fim do mês`
      : undefined;

  return (
    <Layout
      title="Dashboard"
      actions={
        <>
          <MonthSelector value={month} onChange={setMonth} />
          <Link to="/chat">
            <Button variant="primary">
              <Plus size={16} /> Novo gasto
            </Button>
          </Link>
        </>
      }
    >
      {summary.isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {unreadAlert && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle size={16} />
              {unreadAlert.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Total gasto"
              value={formatBRL(s?.totalExpense ?? 0)}
              icon={<ArrowDownCircle size={14} />}
              color="#dc2626"
            />
            <Kpi
              label="Receitas"
              value={formatBRL(s?.totalIncome ?? 0)}
              icon={<ArrowUpCircle size={14} />}
              color="#16a34a"
            />
            <Kpi
              label="Saldo livre"
              value={formatBRL(s?.balance ?? 0)}
              icon={<Wallet size={14} />}
              color="#2563eb"
              hint={paceHint}
            />
            <Kpi
              label="Via WhatsApp"
              value={String(s?.viaWhatsappCount ?? 0)}
              icon={<MessageCircle size={14} />}
              color="#7c3aed"
              hint="registros no mês"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Card className="p-4 lg:col-span-2">
              <div className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                Gastos diários
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? '#1e293b' : '#f1f5f9' }}
                    formatter={(v: number) => [formatBRL(v), 'Gasto']}
                    labelFormatter={(l) => `Dia ${l}`}
                    contentStyle={
                      isDark
                        ? { background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }
                        : undefined
                    }
                  />
                  <Bar dataKey="expense" radius={[3, 3, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.expense > 0 ? '#16a34a' : isDark ? '#334155' : '#e2e8f0'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <div className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                Por categoria
              </div>
              <div className="space-y-2.5">
                {s?.byCategory.length ? (
                  s.byCategory.map((c) => (
                    <div key={c.categoryId} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ background: c.color }}
                      />
                      <span className="w-20 flex-shrink-0 truncate text-xs text-slate-600 dark:text-slate-300">
                        {c.name}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.round(c.pct * 100)}%`, background: c.color }}
                        />
                      </div>
                      <span className="w-16 flex-shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
                        {formatBRL(c.total)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-600">
                    Sem gastos no mês
                  </p>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Últimas transações
                </div>
                <Link to="/transacoes" className="text-xs text-brand hover:underline">
                  ver tudo
                </Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent.data?.data.map((t) => {
                  const Icon = categoryIcon(t.category?.name ?? '');
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ background: `${t.category?.color ?? '#94a3b8'}1a` }}
                      >
                        <Icon size={15} style={{ color: t.category?.color ?? '#64748b' }} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="truncate text-sm text-slate-700 dark:text-slate-200">
                          {t.description}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          {t.category && <Badge color={t.category.color}>{t.category.name}</Badge>}
                          {t.source === 'WHATSAPP' && <span>· via WhatsApp</span>}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-medium ${t.type === 'INCOME' ? 'text-brand' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {t.type === 'INCOME' ? '+' : '-'}
                        {formatBRL(t.amount)}
                      </div>
                    </div>
                  );
                })}
                {!recent.data?.data.length && (
                  <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-600">
                    Nenhuma transação ainda
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <div className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                Orçamentos do mês
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {budgets.data?.length ? (
                  budgets.data.map((b) => {
                    const pct = Math.round(b.pct * 100);
                    const over = pct >= 100;
                    const warn = pct >= 80;
                    const barColor = over ? '#dc2626' : warn ? '#f59e0b' : b.color;
                    return (
                      <div key={b.categoryId} className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {b.categoryName}
                          </span>
                          <span
                            className="text-[11px] font-medium"
                            style={{ color: barColor }}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                          />
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          {formatBRL(b.spent)} / {formatBRL(b.limit)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="col-span-2 py-6 text-center text-sm text-slate-400 dark:text-slate-600">
                    Nenhum orçamento definido
                  </p>
                )}
              </div>
            </Card>
          </div>

          <p className="text-right text-[11px] text-slate-400 dark:text-slate-600">
            Atualizado para {formatDate(new Date().toISOString())} · dados em tempo real da API
          </p>
        </div>
      )}
    </Layout>
  );
}
