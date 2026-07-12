import { env, emailEnabled, isTest } from '../config/env';

/**
 * Envio de e-mail plugável (mesmo padrão do Twilio/Anthropic):
 * com RESEND_API_KEY envia de verdade via Resend; sem chave, simula (log).
 * Nunca lança — falha de e-mail não pode derrubar o fluxo de auth.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!emailEnabled) {
    if (!isTest) console.log(`[email simulado] -> ${to} | ${subject} | ${text}`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
    });
    if (!res.ok && !isTest) {
      console.error('Falha ao enviar e-mail via Resend:', res.status, await res.text());
    }
  } catch (err) {
    if (!isTest) console.error('Falha ao enviar e-mail via Resend:', err);
  }
}
