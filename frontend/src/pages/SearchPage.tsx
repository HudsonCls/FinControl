import { useState } from 'react';
import { Search as SearchIcon, Download } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { MonthSelector } from '@/components/MonthSelector';
import { Card, Input, Spinner, Badge, Button } from '@/components/ui';
import { categoryIcon } from '@/lib/icons';
import { formatBRL, formatDate, currentMonth } from '@/lib/format';
import { useCategories, useSearch } from '@/lib/queries';
import { api } from '@/lib/api';

export default function SearchPage() {
  const [category, setCategory] = useState<string>('');
  const [q, setQ] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [exporting, setExporting] = useState(false);
  const categories = useCategories();

  const params = {
    category: category || undefined,
    q: q.trim() || undefined,
    month,
  };
  const search = useSearch(params);
  const result = search.data;

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get('/reports/export', { params, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fincontrol-transacoes-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Layout
      title="Busca de gastos"
      actions={<MonthSelector value={month} onChange={setMonth} />}
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 dark:border-slate-700">
            <SearchIcon size={16} className="text-slate-400 dark:text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Buscar por descrição (ex: "iFood")'
              className="flex-1 bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategory('')}
              className={`rounded-full border px-3 py-1 text-xs ${
                category === ''
                  ? 'border-brand bg-brand-50 text-brand dark:bg-brand/10'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Todas
            </button>
            {categories.data?.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.name)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  category === c.name
                    ? 'border-brand bg-brand-50 text-brand dark:bg-brand/10'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          {search.isLoading ? (
            <Spinner />
          ) : (
            <>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {category || 'Todas as categorias'} · {q ? `"${q}" · ` : ''}
                    {result?.count ?? 0} lançamento(s)
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-red-600 dark:text-red-400">
                    {formatBRL(result?.total ?? 0)}
                  </div>
                </div>
                <Button
                  onClick={handleExport}
                  loading={exporting}
                  disabled={!result?.count}
                >
                  <Download size={15} /> Exportar CSV
                </Button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {result?.transactions.map((t) => {
                  const Icon = categoryIcon(t.category?.name ?? '');
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-2.5">
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
                          <span>{formatDate(t.date)}</span>
                          {t.source === 'WHATSAPP' && <span>· via WhatsApp</span>}
                        </div>
                      </div>
                      {t.category && <Badge color={t.category.color}>{t.category.name}</Badge>}
                      <div className="w-20 text-right text-sm font-medium text-red-600 dark:text-red-400">
                        {formatBRL(t.amount)}
                      </div>
                    </div>
                  );
                })}
                {!result?.transactions.length && (
                  <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                    Nenhum lançamento encontrado para esse filtro
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}
