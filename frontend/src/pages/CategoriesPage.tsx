import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, Button, Badge, Spinner, Modal, Field, Input } from '@/components/ui';
import { categoryIcon } from '@/lib/icons';
import { formatBRL } from '@/lib/format';
import { apiError } from '@/lib/api';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/lib/queries';

const COLORS = ['#16a34a', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#ef4444', '#6b7280'];

function NewCategoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateCategory();
  const [form, setForm] = useState({ name: '', type: 'EXPENSE', color: COLORS[0], monthlyLimit: '' });
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await create.mutateAsync({
        name: form.name,
        type: form.type,
        color: form.color,
        monthlyLimit: form.monthlyLimit ? Number(form.monthlyLimit.replace(',', '.')) : undefined,
      });
      onClose();
      setForm({ name: '', type: 'EXPENSE', color: COLORS[0], monthlyLimit: '' });
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova categoria">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
          </Field>
          <Field label="Limite mensal (opcional)">
            <Input
              value={form.monthlyLimit}
              onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })}
              inputMode="decimal"
              placeholder="0,00"
            />
          </Field>
        </div>
        <Field label="Cor">
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={`h-7 w-7 rounded-full ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Criar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CategoriesPage() {
  const categories = useCategories();
  const del = useDeleteCategory();
  const [modal, setModal] = useState(false);

  return (
    <Layout
      title="Categorias"
      actions={
        <Button variant="primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Nova categoria
        </Button>
      }
    >
      {categories.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.data?.map((c) => {
            const Icon = categoryIcon(c.name);
            return (
              <Card key={c.id} className="flex items-center gap-3 p-4">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: `${c.color}1a` }}
                >
                  <Icon size={18} style={{ color: c.color }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700">{c.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge color={c.type === 'INCOME' ? '#16a34a' : '#64748b'}>
                      {c.type === 'INCOME' ? 'Receita' : 'Despesa'}
                    </Badge>
                    {c.monthlyLimit != null && (
                      <span className="text-[11px] text-slate-400">
                        limite {formatBRL(c.monthlyLimit)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => del.mutate(c.id)}
                  className="text-slate-300 hover:text-red-500"
                  aria-label="Excluir"
                >
                  <Trash2 size={15} />
                </button>
              </Card>
            );
          })}
        </div>
      )}
      <NewCategoryModal open={modal} onClose={() => setModal(false)} />
    </Layout>
  );
}
