# Avora — app Android (Capacitor)

O app nativo é o **mesmo frontend React**, empacotado com Capacitor. Ele carrega os
assets web locais e fala com a API no Render (definido em `.env.production`).

- **appId:** `com.avora.app` · **appName:** `Avora` (em `capacitor.config.ts`)
- Projeto nativo em `frontend/android/` (versionado; artefatos de build são ignorados).

## Pré-requisitos

- **JDK 17** e **Android SDK** (você já tem: SDK em `C:\RNProjects\sdk`), ou o **Android Studio** (traz tudo).
- Se usar só a linha de comando, confirme `local.properties` em `android/` apontando pro SDK
  (`sdk.dir=C:/RNProjects/sdk`). O arquivo é local e não vai pro Git.

## Gerar o APK de teste (debug)

Duas formas:

**A) Android Studio (recomendado, mais simples):**
```bash
cd frontend
npm run build:app      # builda o web + copia pro projeto Android
npm run android:open   # abre o Android Studio no projeto
```
No Android Studio: Run ▶ (roda no emulador/celular) ou Build > Build APK(s).

**B) Linha de comando:**
```bash
cd frontend
npm run android:apk    # build web + gradle assembleDebug
```
O APK sai em: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

Instalar no celular conectado (depuração USB ligada):
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
Ou rodar direto num aparelho/emulador:
```bash
npm run android:run
```

> **Nota:** se aparecer `Unable to establish loopback connection`, é um bloqueio de
> ambiente (sandbox/antivírus travando o worker do Gradle). Num terminal normal do
> Windows ou no Android Studio isso não acontece — foi só onde este projeto foi montado.

## Depois de mudar o app

Sempre que alterar o código do frontend, rode `npm run build:app` para o app nativo
pegar a nova versão (builda o web + `cap sync`).

Para trocar ícone/splash: edite `scripts/gen-native-assets.mjs` e rode `npm run android:assets`.

## Recursos nativos já integrados

- **Biometria** (digital/Face) na trava do app — pede automaticamente ao abrir, cai no PIN se falhar.
- **Splash screen** verde da marca + **barra de status** verde.
- Tudo protegido por `isNativePlatform()`, então o mesmo código roda no navegador/PWA sem esses recursos.

## Publicar na Play Store (Fase 2)

1. Gerar uma **build de release assinada** (keystore próprio) — `gradlew.bat bundleRelease` gera um `.aab`.
2. Conta de desenvolvedor Google Play (US$ 25, única vez).
3. Preencher listagem + formulário Data Safety.

Notificações push nativas (FCM/Firebase) ficam para o Bloco C.
