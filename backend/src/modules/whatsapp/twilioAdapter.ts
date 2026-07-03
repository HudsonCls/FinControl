import { env, twilioEnabled, isTest } from '../../config/env';
import { normalizePhone } from '../../lib/phone';

export { normalizePhone };

/**
 * Envia uma mensagem de WhatsApp via Twilio quando há credenciais.
 * Sem credenciais (modo simulado), apenas registra no log. Nunca lança.
 */
export async function sendWhatsapp(to: string, body: string): Promise<void> {
  if (!twilioEnabled) {
    if (!isTest) console.log('[whatsapp simulado] ->', normalizePhone(to), ':', body);
    return;
  }
  try {
    // require dinâmico: a lib twilio é opcional e só carrega quando configurada.
    const twilio = require('twilio')(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${normalizePhone(to)}`;
    await twilio.messages.create({ from: env.TWILIO_WHATSAPP_FROM, to: toAddr, body });
  } catch (err) {
    if (!isTest) console.error('Falha ao enviar WhatsApp via Twilio:', err);
  }
}
