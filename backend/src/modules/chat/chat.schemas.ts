import { z } from 'zod';

export const postMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  channel: z.enum(['APP', 'WHATSAPP']).optional(),
});

export type PostMessageInput = z.infer<typeof postMessageSchema>;
