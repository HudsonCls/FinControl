import { useState, type FormEvent } from 'react';
import { MessageCircle, BadgeCheck, AlertTriangle } from 'lucide-react';
import { Modal, Field, Input, Button } from '@/components/ui';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function EmailVerification() {
  const { user, setUser } = useAuth();
  const [step, setStep] = useState<'idle' | 'code'>('idle');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.emailVerifiedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-brand">
        <BadgeCheck size={14} /> E-mail verificado
      </div>
    );
  }

  async function sendCode() {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-email/send');
      setStep('code');
    } catch (err) {
      setError(apiError(err, 'Não foi possível enviar o código'));
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/auth/verify-email', { code: code.trim() });
      setUser(r.data.data.user);
    } catch (err) {
      setError(apiError(err, 'Código inválido'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {step === 'idle' ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">E-mail não verificado</span>
          <Button type="button" onClick={sendCode} loading={loading}>
            Verificar e-mail
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de 6 dígitos"
            inputMode="numeric"
            maxLength={6}
          />
          <Button type="button" variant="primary" onClick={confirm} loading={loading}>
            Confirmar
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function DangerZone({ onClose }: { onClose: () => void }) {
  const { logout } = useAuth();
  const [step, setStep] = useState<'idle' | 'confirm'>('idle');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function deleteAccount() {
    setError('');
    setLoading(true);
    try {
      await api.delete('/auth/me', { data: { password } });
      onClose();
      logout();
    } catch (err) {
      setError(apiError(err, 'Não foi possível excluir a conta'));
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-red-200 p-3 dark:border-red-900">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
        <AlertTriangle size={13} /> Zona de perigo
      </div>
      {step === 'idle' ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Excluir sua conta e todos os dados
          </span>
          <Button type="button" variant="danger" onClick={() => setStep('confirm')}>
            Excluir conta
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Isso apaga <strong>permanentemente</strong> sua conta, transações, categorias,
            orçamentos e histórico do chat. Não dá para desfazer. Digite sua senha para
            confirmar:
          </p>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha atual"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => { setStep('idle'); setPassword(''); setError(''); }}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={deleteAccount}
              loading={loading}
              disabled={!password}
            >
              Excluir permanentemente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

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
        <EmailVerification />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Salvar
          </Button>
        </div>
      </form>
      <DangerZone onClose={onClose} />
      <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
        <a href="/termos" target="_blank" className="hover:underline">Termos de Uso</a>
        {' · '}
        <a href="/privacidade" target="_blank" className="hover:underline">Política de Privacidade</a>
      </p>
    </Modal>
  );
}
