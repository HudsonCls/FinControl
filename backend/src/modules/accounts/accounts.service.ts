import type { Account } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { reaisToCents, centsToReais } from '../../lib/money';
import type { CreateAccountInput, UpdateAccountInput } from './accounts.schemas';

/** Converte o registro do banco (centavos) no formato público da API (reais). */
function serialize(a: Account) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    institution: a.institution,
    balance: centsToReais(a.balanceCents),
    createdAt: a.createdAt,
  };
}

export async function listAccounts(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return accounts.map(serialize);
}

export async function getAccount(userId: string, id: string) {
  const account = await prisma.account.findFirst({ where: { id, userId } });
  if (!account) throw AppError.notFound('Conta não encontrada');
  return serialize(account);
}

export async function createAccount(userId: string, input: CreateAccountInput) {
  const created = await prisma.account.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      institution: input.institution ?? null,
      balanceCents: reaisToCents(input.balance ?? 0),
    },
  });
  return serialize(created);
}

export async function updateAccount(userId: string, id: string, input: UpdateAccountInput) {
  const existing = await prisma.account.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Conta não encontrada');

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.institution !== undefined ? { institution: input.institution ?? null } : {}),
      ...(input.balance !== undefined ? { balanceCents: reaisToCents(input.balance) } : {}),
    },
  });
  return serialize(updated);
}

export async function deleteAccount(userId: string, id: string) {
  const existing = await prisma.account.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Conta não encontrada');
  await prisma.account.delete({ where: { id } });
}
