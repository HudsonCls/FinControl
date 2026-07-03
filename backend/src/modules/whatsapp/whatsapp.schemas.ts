import { z } from 'zod';

/**
 * Aceita tanto o formato simulado ({ from?, text, userId? }) quanto o do
 * Twilio ({ From, Body }). Exige pelo menos um campo de texto.
 */
export const incomingSchema = z
  .object({
    from: z.string().optional(),
    text: z.string().optional(),
    userId: z.string().optional(),
    From: z.string().optional(),
    Body: z.string().optional(),
  })
  .refine((d) => Boolean(d.text || d.Body), {
    message: 'Mensagem de texto obrigatória (text ou Body)',
  });

export type IncomingInput = z.infer<typeof incomingSchema>;
