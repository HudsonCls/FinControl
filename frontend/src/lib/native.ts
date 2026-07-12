import { Capacitor } from '@capacitor/core';

/** true quando rodando dentro do app nativo (Capacitor), false no navegador/PWA. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Há biometria (digital/face) disponível e cadastrada no aparelho? Só no nativo. */
export async function biometricsAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    const info = await BiometricAuth.checkBiometry();
    return info.isAvailable;
  } catch {
    return false;
  }
}

/** Pede a biometria; resolve true no sucesso, false se cancelou/falhou (cai no PIN). */
export async function authenticateBiometric(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    await BiometricAuth.authenticate({
      reason: 'Desbloquear o Avora',
      cancelTitle: 'Usar PIN',
      allowDeviceCredential: true,
      androidTitle: 'Avora',
      androidSubtitle: 'Confirme sua identidade para continuar',
      iosFallbackTitle: 'Usar PIN',
    });
    return true;
  } catch {
    return false;
  }
}

/** Ajustes nativos de UI na inicialização (barra de status verde, esconde splash). */
export async function initNativeShell(): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setBackgroundColor({ color: '#16a34a' });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* status bar indisponível — ignora */
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* splash já escondida — ignora */
  }
}
