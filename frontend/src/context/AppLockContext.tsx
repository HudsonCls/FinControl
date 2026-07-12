import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { biometricsAvailable, authenticateBiometric } from '@/lib/native';

const STORAGE_KEY = 'fincontrol_pin';

/**
 * Trava local do app por PIN. É uma proteção de conveniência (impede alguém
 * que pegou seu celular destravado de abrir o app), NÃO segurança criptográfica
 * — o PIN fica só neste aparelho. A biometria nativa entra na Fase 1-B.
 */
function hashPin(pin: string): string {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) h = ((h << 5) + h + pin.charCodeAt(i)) >>> 0;
  return String(h);
}

interface AppLockCtx {
  pinEnabled: boolean;
  locked: boolean;
  biometricAvailable: boolean;
  unlock: (pin: string) => boolean;
  unlockWithBiometrics: () => Promise<boolean>;
  enablePin: (pin: string) => void;
  disablePin: () => void;
  lock: () => void;
}

const Ctx = createContext<AppLockCtx | undefined>(undefined);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [pinHash, setPinHash] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [locked, setLocked] = useState<boolean>(() => Boolean(localStorage.getItem(STORAGE_KEY)));
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const pinEnabled = pinHash !== null;

  // Descobre uma vez se o aparelho tem biometria (só no app nativo).
  useEffect(() => {
    biometricsAvailable().then(setBiometricAvailable);
  }, []);

  async function unlockWithBiometrics(): Promise<boolean> {
    const ok = await authenticateBiometric();
    if (ok) setLocked(false);
    return ok;
  }

  // Re-tranca ao voltar de segundo plano (comportamento de app de banco).
  useEffect(() => {
    if (!pinEnabled) return;
    function onHide() {
      if (document.visibilityState === 'hidden') setLocked(true);
    }
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [pinEnabled]);

  function unlock(pin: string): boolean {
    if (pinHash && hashPin(pin) === pinHash) {
      setLocked(false);
      return true;
    }
    return false;
  }
  function enablePin(pin: string) {
    const h = hashPin(pin);
    localStorage.setItem(STORAGE_KEY, h);
    setPinHash(h);
    setLocked(false);
  }
  function disablePin() {
    localStorage.removeItem(STORAGE_KEY);
    setPinHash(null);
    setLocked(false);
  }
  function lock() {
    if (pinEnabled) setLocked(true);
  }

  return (
    <Ctx.Provider
      value={{
        pinEnabled,
        locked,
        biometricAvailable,
        unlock,
        unlockWithBiometrics,
        enablePin,
        disablePin,
        lock,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppLock(): AppLockCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAppLock deve ser usado dentro de AppLockProvider');
  return c;
}
