import { useState, type FormEvent } from 'react';
import { Lock, DollarSign } from 'lucide-react';
import { useAppLock } from '@/context/AppLockContext';
import { useAuth } from '@/context/AuthContext';

export function LockScreen() {
  const { unlock, disablePin } = useAppLock();
  const { logout } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (unlock(pin)) return;
    setError(true);
    setPin('');
  }

  function forgot() {
    // Sem o PIN, a recuperação é sair da conta (e remover o PIN local);
    // para voltar, basta o login com e-mail/senha.
    disablePin();
    logout();
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-slate-50 px-8 dark:bg-slate-950">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
        <DollarSign size={26} />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <Lock size={14} /> App bloqueado
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Digite seu PIN para continuar</p>
      </div>

      <form onSubmit={submit} className="flex w-full max-w-[220px] flex-col items-center gap-3">
        <input
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
            setError(false);
          }}
          type="password"
          inputMode="numeric"
          autoFocus
          placeholder="••••"
          className={`w-full rounded-xl border bg-white px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none dark:bg-slate-900 ${
            error
              ? 'border-red-400 dark:border-red-700'
              : 'border-slate-200 focus:border-brand dark:border-slate-700'
          }`}
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">PIN incorreto</p>}
        <button
          type="submit"
          disabled={pin.length < 4}
          className="w-full rounded-xl bg-brand py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          Desbloquear
        </button>
      </form>

      <button onClick={forgot} className="text-xs text-slate-400 hover:underline dark:text-slate-500">
        Esqueci o PIN (sair da conta)
      </button>
    </div>
  );
}
