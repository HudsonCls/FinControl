import { useState } from 'react';
import { MessageCircle, Target, Eye, ChevronRight, DollarSign } from 'lucide-react';

const STORAGE_KEY = 'fincontrol_onboarded';

const SLIDES = [
  {
    icon: MessageCircle,
    title: 'Registre gastos pelo WhatsApp',
    body: 'Mande "gastei 20 no mercado" e o Avora anota, categoriza e responde na hora — sem abrir o app.',
  },
  {
    icon: Target,
    title: 'Orçamentos e alertas',
    body: 'Defina um limite por categoria e receba um aviso automático quando estiver perto de estourar.',
  },
  {
    icon: Eye,
    title: 'Seus dados, no seu controle',
    body: 'Esconda os valores com um toque, alterne entre tema claro e escuro, e exporte tudo em CSV quando quiser.',
  },
];

export function Onboarding() {
  const [show, setShow] = useState(() => localStorage.getItem(STORAGE_KEY) !== '1');
  const [i, setI] = useState(0);

  if (!show) return null;

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  }

  const slide = SLIDES[i];
  const Icon = slide.icon;
  const last = i === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
            <DollarSign size={15} />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Avora</span>
        </div>
        <button onClick={finish} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          Pular
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 dark:bg-brand/10">
          <Icon size={36} className="text-brand" />
        </div>
        <h2 className="max-w-xs text-xl font-semibold text-slate-800 dark:text-slate-100">
          {slide.title}
        </h2>
        <p className="max-w-xs leading-relaxed text-slate-500 dark:text-slate-400">{slide.body}</p>
      </div>

      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? 'w-5 bg-brand' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => (last ? finish() : setI(i + 1))}
          className="flex items-center gap-1 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          {last ? 'Começar' : 'Continuar'} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
