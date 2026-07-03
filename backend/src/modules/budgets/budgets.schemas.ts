import { z } from 'zod';
import { isValidMonth } from '../../lib/dates';

const monthSchema = z
  .string()
  .refine(isValidMonth, { message: 'Mês deve estar no formato YYYY-MM' });

export const setBudgetSchema = z.object({
  categoryId: z.string().min(1),
  month: monthSchema,
  limit: z.number().positive(),
});

export const listBudgetsQuery = z.object({
  month: monthSchema.optional(),
});

export const budgetIdParam = z.object({
  id: z.string().min(1),
});

export const listAlertsQuery = z.object({
  read: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const updateAlertSchema = z.object({
  read: z.boolean(),
});

export const alertIdParam = z.object({
  id: z.string().min(1),
});

export type SetBudgetInput = z.infer<typeof setBudgetSchema>;
