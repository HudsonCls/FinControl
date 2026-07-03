import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().min(1).max(40).default('ti-tag'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve estar no formato #rrggbb')
    .default('#6b7280'),
  type: z.enum(['EXPENSE', 'INCOME']),
  monthlyLimit: z.number().nonnegative().nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParam = z.object({ id: z.string().min(1) });

export const listCategoriesQuery = z.object({
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesFilter = z.infer<typeof listCategoriesQuery>;
