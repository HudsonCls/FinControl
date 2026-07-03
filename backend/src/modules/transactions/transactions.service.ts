import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { reaisToCents, centsToReais } from '../../lib/money';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsFilter,
} from './transactions.schemas';

/** Transação com as relações necessárias para a serialização padrão. */
type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: { category: true; account: true };
}>;

const withRelations = { category: true, account: true } as const;

/** Shape padrão de transação serializada (compartilhado com reports). */
export function serialize(t: TransactionWithRelations) {
  return {
    id: t.id,
    description: t.description,
    amount: centsToReais(t.amountCents),
    type: t.type,
    date: t.date,
    source: t.source,
    notes: t.notes,
    category: t.category
      ? {
          id: t.category.id,
          name: t.category.name,
          icon: t.category.icon,
          color: t.category.color,
        }
      : null,
    account: t.account ? { id: t.account.id, name: t.account.name } : null,
  };
}

/** Garante que a categoria informada pertence ao usuário. */
async function assertCategoryOwnership(userId: string, categoryId: string): Promise<void> {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) throw AppError.badRequest('Categoria não encontrada');
}

/** Garante que a conta informada pertence ao usuário. */
async function assertAccountOwnership(userId: string, accountId: string): Promise<void> {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) throw AppError.badRequest('Conta não encontrada');
}

export async function listTransactions(userId: string, filter: ListTransactionsFilter) {
  const where: Prisma.TransactionWhereInput = { userId };

  if (filter.categoryId) where.categoryId = filter.categoryId;
  if (filter.accountId) where.accountId = filter.accountId;
  if (filter.type) where.type = filter.type;
  if (filter.source) where.source = filter.source;

  if (filter.from || filter.to) {
    where.date = {};
    if (filter.from) where.date.gte = new Date(filter.from);
    if (filter.to) where.date.lte = new Date(filter.to);
  }

  if (filter.q) {
    where.description = { contains: filter.q };
  }

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: withRelations,
      orderBy: { date: 'desc' },
      take: filter.limit,
      skip: filter.offset,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data: items.map(serialize),
    meta: { total, limit: filter.limit, offset: filter.offset },
  };
}

export async function getTransaction(userId: string, id: string) {
  const tx = await prisma.transaction.findFirst({
    where: { id, userId },
    include: withRelations,
  });
  if (!tx) throw AppError.notFound('Transação não encontrada');
  return serialize(tx);
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  if (input.categoryId) await assertCategoryOwnership(userId, input.categoryId);
  if (input.accountId) await assertAccountOwnership(userId, input.accountId);

  const created = await prisma.transaction.create({
    data: {
      userId,
      description: input.description,
      amountCents: reaisToCents(input.amount),
      type: input.type,
      date: input.date ? new Date(input.date) : new Date(),
      source: input.source,
      categoryId: input.categoryId ?? null,
      accountId: input.accountId ?? null,
      notes: input.notes ?? null,
    },
    include: withRelations,
  });
  return serialize(created);
}

export async function updateTransaction(userId: string, id: string, input: UpdateTransactionInput) {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Transação não encontrada');

  if (input.categoryId) await assertCategoryOwnership(userId, input.categoryId);
  if (input.accountId) await assertAccountOwnership(userId, input.accountId);

  const data: Prisma.TransactionUpdateInput = {};
  if (input.description !== undefined) data.description = input.description;
  if (input.amount !== undefined) data.amountCents = reaisToCents(input.amount);
  if (input.type !== undefined) data.type = input.type;
  if (input.date !== undefined) data.date = new Date(input.date);
  if (input.source !== undefined) data.source = input.source;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.categoryId !== undefined) {
    data.category = input.categoryId
      ? { connect: { id: input.categoryId } }
      : { disconnect: true };
  }
  if (input.accountId !== undefined) {
    data.account = input.accountId ? { connect: { id: input.accountId } } : { disconnect: true };
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data,
    include: withRelations,
  });
  return serialize(updated);
}

export async function deleteTransaction(userId: string, id: string) {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Transação não encontrada');
  await prisma.transaction.delete({ where: { id } });
}
