import type { Alert, Budget } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { reaisToCents, centsToReais } from '../../lib/money';
import { monthRange } from '../../lib/dates';

export interface SerializedBudget {
  id: string;
  categoryId: string;
  month: string;
  limit: number;
  createdAt: Date;
}

function serializeBudget(b: Budget): SerializedBudget {
  return {
    id: b.id,
    categoryId: b.categoryId,
    month: b.month,
    limit: centsToReais(b.limitCents),
    createdAt: b.createdAt,
  };
}

/** Soma (em centavos) das despesas da categoria no mês. */
async function spentCentsFor(userId: string, categoryId: string, month: string): Promise<number> {
  const { start, end } = monthRange(month);
  const agg = await prisma.transaction.aggregate({
    _sum: { amountCents: true },
    where: {
      userId,
      categoryId,
      type: 'EXPENSE',
      date: { gte: start, lt: end },
    },
  });
  return agg._sum.amountCents ?? 0;
}

/** Garante que a categoria pertence ao usuário; lança notFound caso contrário. */
async function assertOwnedCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) throw AppError.notFound('Categoria não encontrada');
  return category;
}

export async function setBudget(
  userId: string,
  categoryId: string,
  month: string,
  limitReais: number,
): Promise<SerializedBudget> {
  await assertOwnedCategory(userId, categoryId);
  const limitCents = reaisToCents(limitReais);
  const budget = await prisma.budget.upsert({
    where: { userId_categoryId_month: { userId, categoryId, month } },
    update: { limitCents },
    create: { userId, categoryId, month, limitCents },
  });
  return serializeBudget(budget);
}

export async function deleteBudget(userId: string, id: string): Promise<void> {
  const budget = await prisma.budget.findFirst({ where: { id, userId } });
  if (!budget) throw AppError.notFound('Orçamento não encontrado');
  await prisma.budget.delete({ where: { id: budget.id } });
}

export interface BudgetStatus {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  limit: number;
  spent: number;
  pct: number;
  remaining: number;
}

export async function getBudgetsStatus(userId: string, month: string): Promise<BudgetStatus[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId, month },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });

  const result: BudgetStatus[] = [];
  for (const budget of budgets) {
    const spentCents = await spentCentsFor(userId, budget.categoryId, month);
    const limitCents = budget.limitCents;
    const pct = limitCents > 0 ? spentCents / limitCents : 0;
    result.push({
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      icon: budget.category.icon,
      color: budget.category.color,
      limit: centsToReais(limitCents),
      spent: centsToReais(spentCents),
      pct,
      remaining: centsToReais(limitCents - spentCents),
    });
  }
  return result;
}

/**
 * Avalia os orçamentos do mês e cria alertas ao cruzar 80% (0.8) e 100% (1.0) do limite.
 * Idempotente: não duplica alerta NÃO-LIDO para a mesma (categoria, mês, threshold).
 */
export async function evaluateAlerts(userId: string, month: string): Promise<Alert[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId, month },
    include: { category: true },
  });

  const created: Alert[] = [];
  for (const budget of budgets) {
    const limitCents = budget.limitCents;
    if (limitCents <= 0) continue;

    const spentCents = await spentCentsFor(userId, budget.categoryId, month);
    const pct = spentCents / limitCents;

    let threshold: number | null = null;
    if (pct >= 1.0) threshold = 1.0;
    else if (pct >= 0.8) threshold = 0.8;

    if (threshold === null) continue;

    const existing = await prisma.alert.findFirst({
      where: {
        userId,
        categoryId: budget.categoryId,
        month,
        threshold,
        read: false,
      },
    });
    if (existing) continue;

    const pctLabel = Math.round(pct * 100);
    const message = `Você atingiu ${pctLabel}% do limite em ${budget.category.name}`;

    const alert = await prisma.alert.create({
      data: {
        userId,
        categoryId: budget.categoryId,
        month,
        threshold,
        spentCents,
        limitCents,
        message,
      },
    });
    created.push(alert);
  }
  return created;
}

/** Lista alertas do usuário (mais novos primeiro), opcionalmente filtrando por lido/não-lido. */
export async function listAlerts(userId: string, read?: boolean): Promise<Alert[]> {
  return prisma.alert.findMany({
    where: { userId, ...(read === undefined ? {} : { read }) },
    orderBy: { createdAt: 'desc' },
  });
}

/** Marca um alerta como lido/não-lido (com checagem de posse). */
export async function setAlertRead(userId: string, id: string, read: boolean): Promise<Alert> {
  const alert = await prisma.alert.findFirst({ where: { id, userId } });
  if (!alert) throw AppError.notFound('Alerta não encontrado');
  return prisma.alert.update({ where: { id: alert.id }, data: { read } });
}

/** Remove um alerta (com checagem de posse). */
export async function deleteAlert(userId: string, id: string): Promise<void> {
  const alert = await prisma.alert.findFirst({ where: { id, userId } });
  if (!alert) throw AppError.notFound('Alerta não encontrado');
  await prisma.alert.delete({ where: { id: alert.id } });
}
