import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'fincontrol_privacy';

interface PrivacyCtx {
  hidden: boolean;
  toggle: () => void;
}

const Ctx = createContext<PrivacyCtx | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<boolean>(() => localStorage.getItem(STORAGE_KEY) === '1');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, hidden ? '1' : '0');
  }, [hidden]);

  return (
    <Ctx.Provider value={{ hidden, toggle: () => setHidden((h) => !h) }}>{children}</Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrivacy(): PrivacyCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrivacy deve ser usado dentro de PrivacyProvider');
  return c;
}
