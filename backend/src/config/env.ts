import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_WHATSAPP_FROM: z.string().optional().default(''),
  WHATSAPP_VERIFY_TOKEN: z.string().default('fincontrol-verify'),
  // Se definido, o POST do webhook exige ?token=<secret> (protege contra abuso público).
  WHATSAPP_WEBHOOK_SECRET: z.string().optional().default(''),
  // "*" libera tudo (padrão). Em produção, use a URL do frontend (Vercel).
  CORS_ORIGIN: z.string().default('*'),
  // Usado só pelo Prisma CLI (migrations/db push) com Supabase. Não é lido pela app.
  DIRECT_URL: z.string().optional().default(''),
  // Proteção de força bruta em /api/auth/login. Padrão: 10 tentativas / 15min por IP.
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().default(10),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Configuração de ambiente inválida:', parsed.error.flatten().fieldErrors);
  throw new Error('Variáveis de ambiente inválidas');
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
/** IA de categorização ligada quando há chave da Anthropic. */
export const aiEnabled = Boolean(env.ANTHROPIC_API_KEY);
/** Envio real via WhatsApp ligado quando há credenciais Twilio. */
export const twilioEnabled = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);
