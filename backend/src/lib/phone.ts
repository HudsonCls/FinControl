/**
 * Normaliza telefone para comparação estável entre o que o usuário digita no
 * app e o que o Twilio manda no webhook ("whatsapp:+5561999990000").
 * Remove o prefixo "whatsapp:", espaços e pontuação; preserva o "+" inicial.
 */
export function normalizePhone(raw: string): string {
  const stripped = raw.replace(/^whatsapp:/i, '').trim();
  const hasPlus = stripped.startsWith('+');
  const digits = stripped.replace(/\D/g, '');
  return (hasPlus ? '+' : '') + digits;
}

/** Formato esperado: "+" seguido de 8 a 15 dígitos (E.164). */
export const PHONE_REGEX = /^\+\d{8,15}$/;
