import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(120),
  phone: z.string().min(1).max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateMeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  // null limpa o telefone (desvincula do WhatsApp); string define/atualiza.
  phone: z.union([z.string().min(1).max(30), z.null()]).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
