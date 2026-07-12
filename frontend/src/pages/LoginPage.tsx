import { useState, type FormEvent } from 'react';
import { DollarSign } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api, apiError } from '@/lib/api';
import { Button, Input, Field, Modal } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';

function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot', { email });
      setStep('code');
    } catch (err) {
      setError(apiError(err, 'Não foi possível enviar o código'));
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset', { email, code: code.trim(), newPassword });
      setStep('done');
    } catch (err) {
      setError(apiError(err, 'Código inválido ou expirado'));
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setStep('email');
    setEmail('');
    setCode('');
    setNewPassword('');
    setError('');
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="Redefinir senha">
      {step === 'email' && (
        <form onSubmit={requestCode} className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Informe seu e-mail. Enviaremos um código de 6 dígitos por e-mail e, se o seu
            WhatsApp estiver vinculado, também por lá.
          </p>
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" variant="primary" loading={loading} className="w-full">
            Enviar código
          </Button>
        </form>
      )}
      {step === 'code' && (
        <form onSubmit={confirmReset} className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Digite o código recebido e a nova senha.
          </p>
          <Field label="Código de 6 dígitos">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              required
            />
          </Field>
          <Field label="Nova senha (mín. 6 caracteres)">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" variant="primary" loading={loading} className="w-full">
            Redefinir senha
          </Button>
        </form>
      )}
      {step === 'done' && (
        <div className="space-y-3 text-center">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Senha redefinida com sucesso! Entre com a nova senha.
          </p>
          <Button variant="primary" onClick={close} className="w-full">
            Voltar ao login
          </Button>
        </div>
      )}
    </Modal>
  );
}

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@fincontrol.dev');
  const [password, setPassword] = useState('demo1234');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register({ name, email, password, phone: phone || undefined });
    } catch (err) {
      setError(apiError(err, 'Não foi possível entrar'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <DollarSign size={24} />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Avora</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">seu hub de controle financeiro</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
            <button
              className={`flex-1 rounded-md py-1.5 font-medium ${mode === 'login' ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
              onClick={() => setMode('login')}
            >
              Entrar
            </button>
            <button
              className={`flex-1 rounded-md py-1.5 font-medium ${mode === 'register' ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
              onClick={() => setMode('register')}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'register' && (
              <Field label="Nome">
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" />
              </Field>
            )}
            <Field label="E-mail">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Senha">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {mode === 'register' && (
              <Field label="Telefone (WhatsApp, opcional)">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+5561999990000" />
              </Field>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button type="submit" variant="primary" loading={loading} className="w-full">
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="mt-3 w-full text-center text-xs text-brand hover:underline"
            >
              Esqueci minha senha
            </button>
          )}
          {mode === 'register' && (
            <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
              Ao criar a conta você concorda com os{' '}
              <a href="/termos" target="_blank" className="underline">Termos de Uso</a> e a{' '}
              <a href="/privacidade" target="_blank" className="underline">
                Política de Privacidade
              </a>
              .
            </p>
          )}
          {mode === 'login' && (
            <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
              Demo: demo@fincontrol.dev / demo1234
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-600">
          <a href="/termos" target="_blank" className="hover:underline">Termos de Uso</a>
          {' · '}
          <a href="/privacidade" target="_blank" className="hover:underline">
            Política de Privacidade
          </a>
        </p>
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
}
