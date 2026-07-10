import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { MonthSelector } from '@/components/MonthSelector';
import { Card, Button, Spinner } from '@/components/ui';
import { Money } from '@/components/Money';
import { categoryIcon } from '@/lib/icons';
import { currentMonth } from '@/lib/format';
import { useCategories, useBudgets, useSummary, useSetBudget } from '@/lib/queries';

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth());
  const categories = useCategories();
  const budgets = useBudgets(month);
  const summary = useSummary(month);
  const setBudget = useSetBudget();
  const [edits, setEdits] = useState<Record<string, string>>({});

  const expenseCats = categories.data?.filter((c) => c.type === 'EXPENSE') ?? [];

  function limitOf(categoryId: string): number {
    return budgets.data?.find((b) => b.categoryId === categoryId)?.limit ?? 0;
  }
  function spentOf(categoryId: string): number {
    return summary.data?.byCategory.find((c) => c.categoryId === categoryId)?.total ?? 0;
  }

  async function save(categoryId: string) {
    const raw = edits[categoryId];
    if (raw === undefined) return;
    const limit = Number(raw.replace(',', '.'));
    if (Number.isNaN(limit) || limit < 0) return;
    await setBudget.mutateAsync({ categoryId, month, limit });
    setEdits((e) => {
      const next = { ...e };
      delete next[categoryId];
      return next;
    });
  }

  const loading = categories.isLoading || budgets.isLoading || summary.isLoading;

  return (
    <Layout title="Orçamentos" actions={<MonthSelector value={month} onChange={setMonth} />}>
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {expenseCats.map((c) => {
            const limit = limitOf(c.id);
            const spent = spentOf(c.id);
            const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            const over = pct >= 100;
            const warn = pct >= 80;
            const barColor = over ? '#dc2626' : warn ? '#f59e0b' : c.color;
            const Icon = categoryIcon(c.name);
            const editing = edits[c.id] !== undefined;
            return (
              <Card key={c.id} className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: `${c.color}1a` }}
                  >
                    <Icon size={16} style={{ color: c.color }} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {c.name}
                  </span>
                  {limit > 0 && (
                    <span className="text-xs font-medium" style={{ color: barColor }}>
                      {pct}%
                    </span>
                  )}
                </div>

                {limit > 0 && (
                  <>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      <Money value={spent} /> de <Money value={limit} />
                    </div>
                  </>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-1 rounded-lg border border-slate-200 px-2 dark:border-slate-700">
                    <span className="text-xs text-slate-400 dark:text-slate-500">R$</span>
                    <input
                      value={editing ? edits[c.id] : limit || ''}
                      onChange={(e) => setEdits((s) => ({ ...s, [c.id]: e.target.value }))}
                      placeholder="definir limite"
                      inputMode="decimal"
                      className="w-full bg-transparent py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => save(c.id)}
                    disabled={!editing}
                    loading={setBudget.isPending && setBudget.variables?.categoryId === c.id}
                  >
                    Salvar
                  </Button>
                </div>
              </Card>
            );
          })}
          {!expenseCats.length && (
            <p className="text-sm text-slate-400 dark:text-slate-600">
              Crie categorias de despesa primeiro para definir orçamentos.
            </p>
          )}
        </div>
      )}
    </Layout>
  );
}
