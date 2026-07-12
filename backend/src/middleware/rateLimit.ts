import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Limita tentativas de login por IP — proteção básica contra força bruta de senha.
 * Requer `app.set('trust proxy', ...)` configurado corretamente atrás de um proxy
 * (Render/Vercel) para que req.ip reflita o IP real do cliente, não o do proxy.
 */
export const loginRateLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
    },
  },
});

/**
 * Limite para os fluxos de código (esqueci a senha / verificação): mais folgado
 * que o de login, mas impede spam de e-mail/WhatsApp e força bruta do código
 * de 6 dígitos. Contador próprio, independente do de login.
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas tentativas. Tente novamente em alguns minutos.',
    },
  },
});
