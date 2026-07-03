import { z } from 'zod';

/** Aceita "YYYY-MM" (mês). */
const monthString = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Mês deve estar no formato YYYY-MM');

/** GET /summary?month=YYYY-MM (month opcional; default = mês atual). */
export const summaryQuery = z.object({
  month: monthString.optional(),
});

/** GET /by-category?month=YYYY-MM (month opcional; default = mês atual). */
export const byCategoryQuery = z.object({
  month: monthString.optional(),
});

/**
 * GET /search — busca de transações.
 * "category" casa por id OU nome (resolvido no service).
 * "from"/"to" são datas ISO; "month" tem prioridade para derivar o intervalo.
 */
export const searchQuery = z.object({
  category: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  month: monthString.optional(),
  source: z.enum(['APP', 'WHATSAPP', 'IMPORT']).optional(),
});

export type SummaryQuery = z.infer<typeof summaryQuery>;
export type ByCategoryQuery = z.infer<typeof byCategoryQuery>;
export type SearchQuery = z.infer<typeof searchQuery>;
