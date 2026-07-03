import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, Button, Badge, Spinner, Modal, Field, Input } from '@/components/ui';
import { categoryIcon } from '@/lib/icons';
import { formatBRL, formatDate } from '@/lib/format';
import { apiError } from '@/lib/api';
import {
  useTransactions,
  useCategories,
  useAccounts,
  useCreateTransaction,
  useDeleteTransaction,
  type TxFilters,
} from '@/lib/queries';

function NewTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useCategories();
  const accounts = useAccounts();
  const create = useCreateTransaction();
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE',
    date: new Date().toISOString().slice(0, 10),
    categoryId: '',
    accountId: '',
  });
  const [error, setError] = useState('');

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await create.mutateAsync({
        description: form.description,
        amount: Number(form.amount.replace(',', '.')),
        type: form.type,
        date: new Date(form.date).toISOString(),
        categoryId: form.categoryId || undefined,
        accountId: form.accountId || undefined,
      });
      onClose();
      setForm({ ...form, description: '', amount: '' });
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova transação">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Descrição">
          <Input value={form.description} onChange={(e) => set('description', e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)">
            <Input
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              required
              inputMode="decimal"
              placeholder="0,00"
            />
          </Field>
          <Field label="Tipo">
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Categoria">
            <select
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">—</option>
              {categories.data
                ?.filter((c) => c.type === form.type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <Field label="Conta">
          <select
            value={form.accountId}
            onChange={(e) => set('accountId', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="">—</option>
            {accounts.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TxFilters>({ limit: 50, offset: 0 });
  const [modal, setModal] = useState(false);
  const categories = useCategories();
  const txs = useTransactions(filters);
  const del = useDeleteTransaction();

  const meta = txs.data?.meta;

  function setFilter(k: keyof TxFilters, v: string) {
    setFilters((f) => ({ ...f, [k]: v || undefined, offset: 0 }));
  }

  return (
    <Layout
      title="Transações"
      actions={
        <Button variant="primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Nova transação
        </Button>
      }
    >
      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <input
          placeholder="Buscar descrição..."
          onChange={(e) => setFilter('q', e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <select
          onChange={(e) => setFilter('type', e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">Todos os tipos</option>
          <option value="EXPENSE">Despesas</option>
          <option value="INCOME">Receitas</option>
        </select>
        <select
          onChange={(e) => setFilter('categoryId', e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">Todas as categorias</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          onChange={(e) => setFilter('source', e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">Todas as origens</option>
          <option value="APP">App</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      </Card>

      <Card className="overflow-hidden">
        {txs.isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-4 py-2.5 font-medium">Data</th>
                <th className="px-4 py-2.5 font-medium">Descrição</th>
                <th className="px-4 py-2.5 font-medium">Categoria</th>
                <th className="px-4 py-2.5 font-medium">Origem</th>
                <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {txs.data?.data.map((t) => {
                const Icon = categoryIcon(t.category?.name ?? '');
                return (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{formatDate(t.date)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Icon size={15} style={{ color: t.category?.color ?? '#94a3b8' }} />
                        <span className="text-slate-700">{t.description}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {t.category ? <Badge color={t.category.color}>{t.category.name}</Badge> : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {t.source === 'WHATSAPP' ? 'WhatsApp' : t.source === 'APP' ? 'App' : t.source}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 text-right font-medium ${
                        t.type === 'INCOME' ? 'text-brand' : 'text-red-600'
                      }`}
                    >
                      {t.type === 'INCOME' ? '+' : '-'}
                      {formatBRL(t.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => del.mutate(t.id)}
                        className="text-slate-300 hover:text-red-500"
                        aria-label="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!txs.data?.data.length && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {meta && meta.total > meta.limit && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span>
            {meta.offset + 1}–{Math.min(meta.offset + meta.limit, meta.total)} de {meta.total}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={meta.offset === 0}
              onClick={() => setFilters((f) => ({ ...f, offset: Math.max(0, (f.offset ?? 0) - (f.limit ?? 50)) }))}
            >
              Anterior
            </Button>
            <Button
              disabled={meta.offset + meta.limit >= meta.total}
              onClick={() => setFilters((f) => ({ ...f, offset: (f.offset ?? 0) + (f.limit ?? 50) }))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <NewTransactionModal open={modal} onClose={() => setModal(false)} />
    </Layout>
  );
}
