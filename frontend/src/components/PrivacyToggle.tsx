import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '@/context/PrivacyContext';

/** Botão "olho" que oculta/mostra todos os valores monetários (estilo apps de banco). */
export function PrivacyToggle() {
  const { hidden, toggle } = usePrivacy();
  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={hidden}
      aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
      title={hidden ? 'Mostrar valores' : 'Ocultar valores'}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
    >
      {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );
}
