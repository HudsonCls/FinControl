import { useState, type FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { Modal, Field, Input, Button } from '@/components/ui';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api.patch('/auth/me', {
        name,
        phone: phone.trim() ? phone.trim() : null,
      });
      setUser(r.data.data.user);
      onClose();
    } catch (err) {
      setError(apiError(err, 'Não foi possível salvar'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Meu perfil">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Telefone do WhatsApp">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+5511999999999"
          />
        </Field>
        <div className="flex items-start gap-2 rounded-lg bg-brand-50 p-2.5 text-xs text-emerald-900 dark:bg-brand/10 dark:text-emerald-300">
          <MessageCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            Cadastre seu número com código do país (ex: <code>+5511999999999</code>) para
            registrar gastos direto pelo WhatsApp. Deixe em branco para desvincular.
          </span>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
