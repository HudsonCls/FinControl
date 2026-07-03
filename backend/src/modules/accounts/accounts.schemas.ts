import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH']),
  institution: z.string().min(1).max(80).nullable().optional(),
  balance: z.number().default(0),
});

export const updateAccountSchema = createAccountSchema.partial();

export const accountIdParam = z.object({ id: z.string().min(1) });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
