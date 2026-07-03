import { z } from 'zod';

/** Aceita "YYYY-MM-DD" ou ISO completo e devolve um Date válido. */
const dateInput = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Data inválida' });

export const createTransactionSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  type: z.enum(['EXPENSE', 'INCOME']),
  date: dateInput.optional(),
  categoryId: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
  source: z.enum(['APP', 'WHATSAPP', 'IMPORT']).default('APP'),
  notes: z.string().max(500).nullable().optional(),
});

export const updateTransactionSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  date: dateInput.optional(),
  categoryId: z.string().min(1).nullable().optional(),
  accountId: z.string().min(1).nullable().optional(),
  source: z.enum(['APP', 'WHATSAPP', 'IMPORT']).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const transactionIdParam = z.object({ id: z.string().min(1) });

export const listTransactionsQuery = z.object({
  categoryId: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  source: z.enum(['APP', 'WHATSAPP', 'IMPORT']).optional(),
  from: dateInput.optional(),
  to: dateInput.optional(),
  q: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsFilter = z.infer<typeof listTransactionsQuery>;
