import type { Category } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { reaisToCents, centsToReais } from '../../lib/money';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesFilter,
} from './categories.schemas';

/** Converte o registro do banco (centavos) no formato público da API (reais). */
function serialize(c: Category) {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    type: c.type,
    monthlyLimit: c.monthlyLimitCents === null ? null : centsToReais(c.monthlyLimitCents),
    createdAt: c.createdAt,
  };
}

export async function listCategories(userId: string, filter: ListCategoriesFilter) {
  const categories = await prisma.category.findMany({
    where: { userId, ...(filter.type ? { type: filter.type } : {}) },
    orderBy: { createdAt: 'asc' },
  });
  return categories.map(serialize);
}

export async function getCategory(userId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) throw AppError.notFound('Categoria não encontrada');
  return serialize(category);
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  const existing = await prisma.category.findUnique({
    where: { userId_name: { userId, name: input.name } },
  });
  if (existing) throw AppError.conflict('Já existe uma categoria com esse nome');

  const created = await prisma.category.create({
    data: {
      userId,
      name: input.name,
      icon: input.icon ?? 'ti-tag',
      color: input.color ?? '#6b7280',
      type: input.type,
      monthlyLimitCents: input.monthlyLimit == null ? null : reaisToCents(input.monthlyLimit),
    },
  });
  return serialize(created);
}

export async function updateCategory(userId: string, id: string, input: UpdateCategoryInput) {
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Categoria não encontrada');

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.monthlyLimit !== undefined
        ? {
            monthlyLimitCents:
              input.monthlyLimit == null ? null : reaisToCents(input.monthlyLimit),
          }
        : {}),
    },
  });
  return serialize(updated);
}

export async function deleteCategory(userId: string, id: string) {
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Categoria não encontrada');
  await prisma.category.delete({ where: { id } });
}
