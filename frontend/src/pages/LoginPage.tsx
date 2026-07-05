import { useState, type FormEvent } from 'react';
import { DollarSign } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiError } from '@/lib/api';
import { Button, Input, Field } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@fincontrol.dev');
  const [password, setPassword] = useState('demo1234');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">FinControl</h1>
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
            <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
              Demo: demo@fincontrol.dev / demo1234
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
