import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Wallet, CreditCard, Landmark, Banknote } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, Button, Spinner, Modal, Field, Input } from '@/components/ui';
import { formatBRL } from '@/lib/format';
import { apiError } from '@/lib/api';
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/lib/queries';
import type { AccountType } from '@/lib/types';

const TYPE_LABEL: Record<AccountType, string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  CREDIT_CARD: 'Cartão de crédito',
  CASH: 'Dinheiro',
};

const TYPE_ICON: Record<AccountType, typeof Wallet> = {
  CHECKING: Landmark,
  SAVINGS: Wallet,
  CREDIT_CARD: CreditCard,
  CASH: Banknote,
};

function NewAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateAccount();
  const [form, setForm] = useState({ name: '', type: 'CHECKING', institution: '', balance: '' });
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await create.mutateAsync({
        name: form.name,
        type: form.type,
        institution: form.institution || undefined,
        balance: form.balance ? Number(form.balance.replace(',', '.')) : 0,
      });
      onClose();
      setForm({ name: '', type: 'CHECKING', institution: '', balance: '' });
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova conta">
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
              {Object.entries(TYPE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Saldo (R$)">
            <Input
              value={form.balance}
              onChange={(e) => setForm({ ...form, balance: e.target.value })}
              inputMode="decimal"
              placeholder="0,00"
            />
          </Field>
        </div>
        <Field label="Instituição (opcional)">
          <Input
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
          />
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

export default function AccountsPage() {
  const accounts = useAccounts();
  const del = useDeleteAccount();
  const [modal, setModal] = useState(false);

  return (
    <Layout
      title="Contas e cartões"
      actions={
        <Button variant="primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Nova conta
        </Button>
      }
    >
      {accounts.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.data?.map((a) => {
            const Icon = TYPE_ICON[a.type] ?? Wallet;
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                    <Icon size={18} className="text-brand" />
                  </div>
                  <button
                    onClick={() => del.mutate(a.id)}
                    className="text-slate-300 hover:text-red-500"
                    aria-label="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="mt-3 text-sm font-medium text-slate-700">{a.name}</div>
                <div className="text-[11px] text-slate-400">
                  {TYPE_LABEL[a.type]}
                  {a.institution ? ` · ${a.institution}` : ''}
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-800">{formatBRL(a.balance)}</div>
              </Card>
            );
          })}
          {!accounts.data?.length && (
            <p className="text-sm text-slate-400">Nenhuma conta cadastrada ainda.</p>
          )}
        </div>
      )}
      <NewAccountModal open={modal} onClose={() => setModal(false)} />
    </Layout>
  );
}
