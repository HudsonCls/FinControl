import { prisma } from '../../lib/prisma';
import { processMessage } from '../chat/chat.service';
import { normalizePhone, sendWhatsapp } from './twilioAdapter';

export interface IncomingMessage {
  from?: string;
  text: string;
  userId?: string;
}

export interface IncomingResult {
  handled: boolean;
  reply: string;
}

/** Descobre o usuário pela conta (userId) ou pelo telefone do WhatsApp. */
export async function resolveUserId(opts: { userId?: string; from?: string }): Promise<string | null> {
  if (opts.userId) {
    const user = await prisma.user.findUnique({ where: { id: opts.userId } });
    if (user) return user.id;
  }
  if (opts.from) {
    const phone = normalizePhone(opts.from);
    const user = await prisma.user.findFirst({ where: { phone } });
    if (user) return user.id;
  }
  return null;
}

/**
 * Processa uma mensagem recebida do WhatsApp: resolve o usuário, delega ao
 * chat (mesma IA do app) e responde de volta pelo canal (se configurado).
 */
export async function processIncoming(opts: IncomingMessage): Promise<IncomingResult> {
  const userId = await resolveUserId(opts);
  if (!userId) {
    return {
      handled: false,
      reply: 'Este número não está vinculado a uma conta FinControl.',
    };
  }

  const result = await processMessage(userId, opts.text, 'WHATSAPP');
  if (opts.from) await sendWhatsapp(opts.from, result.reply);
  return { handled: true, reply: result.reply };
}
