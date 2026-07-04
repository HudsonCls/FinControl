import type { Prisma, Transaction, Category, Account } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { centsToReais } from '../../lib/money';
import { monthRange, dayKey } from '../../lib/dates';

/** Shape público padrão de uma transação serializada (compartilhado com transactions). */
export interface SerializedTransaction {
  id: string;
  description: string;
  amount: number; // reais
  type: string;
  date: Date;
  source: string;
  notes: string | null;
  category: { id: string; name: string; icon: string; color: string } | null;
  account: { id: string; name: string } | null;
}

/** Transação com as relações que usamos no shape padrão. */
type TxWithRelations = Transaction & {
  category: Category | null;
  account: Account | null;
};

/** Converte o registro do banco (centavos) no shape público (reais). */
function serializeTransaction(t: TxWithRelations): SerializedTransaction {
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

export interface SearchOptions {
  categoryId?: string;
  categoryName?: string;
  type?: 'EXPENSE' | 'INCOME';
  from?: Date;
  to?: Date;
  q?: string;
  month?: string;
  source?: string;
}

export interface SearchResult {
  totalCents: number;
  totalReais: number;
  count: number;
  transactions: SerializedTransaction[];
}

/**
 * Busca transações do usuário aplicando filtros.
 * - categoryName é resolvido para id por match case-insensitive nas categorias do usuário.
 * - month, quando presente, deriva from/to via monthRange.
 * - q busca em description (contains, case-insensitive).
 * Soma amountCents em inteiros; converte só na borda.
 */
export async function searchTransactions(
  userId: string,
  opts: SearchOptions,
): Promise<SearchResult> {
  const where: Prisma.TransactionWhereInput = { userId };

  // Resolve a categoria. A rota pode passar o MESMO valor em categoryId e
  // categoryName ("category" casa por id OU nome). Estratégia:
  //  1) se categoryId casar com uma categoria do usuário, usa esse id;
  //  2) senão, tenta resolver categoryName por nome (case-insensitive);
  //  3) se nada casar, não há resultado possível.
  let categoryId: string | undefined;
  const needsCategory = Boolean(opts.categoryId || opts.categoryName);
  if (needsCategory) {
    const categories = await prisma.category.findMany({ where: { userId } });

    if (opts.categoryId) {
      const byId = categories.find((c) => c.id === opts.categoryId);
      if (byId) categoryId = byId.id;
    }

    if (!categoryId && opts.categoryName) {
      const target = opts.categoryName.trim().toLowerCase();
      const byName = categories.find((c) => c.name.toLowerCase() === target);
      if (byName) categoryId = byName.id;
    }

    if (!categoryId) {
      // Nem id nem nome casaram: nenhum resultado possível.
      return { totalCents: 0, totalReais: 0, count: 0, transactions: [] };
    }
    where.categoryId = categoryId;
  }

  if (opts.type) where.type = opts.type;
  if (opts.source) where.source = opts.source;

  // Intervalo de datas: month tem prioridade sobre from/to soltos.
  let from = opts.from;
  let to = opts.to;
  if (opts.month) {
    const range = monthRange(opts.month);
    from = range.start;
    to = range.end;
  }
  if (from || to) {
    where.date = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lt: to } : {}),
    };
  }

  if (opts.q) {
    // SQLite não suporta mode:'insensitive' no Prisma; LIKE já é case-insensitive
    // para ASCII no SQLite, então usamos contains direto.
    where.description = { contains: opts.q };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
  });

  const totalCents = transactions.reduce((sum, t) => sum + t.amountCents, 0);

  return {
    totalCents,
    totalReais: centsToReais(totalCents),
    count: transactions.length,
    transactions: transactions.map(serializeTransaction),
  };
}

export interface MonthlySummaryByCategory {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  total: number; // reais
  pct: number; // total / totalExpense
}

export interface MonthlySummaryDaily {
  date: string; // "YYYY-MM-DD"
  expense: number; // reais
}

export interface MonthlySummary {
  month: string;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  viaWhatsappCount: number;
  byCategory: MonthlySummaryByCategory[];
  daily: MonthlySummaryDaily[];
}

/**
 * Resumo mensal do dashboard. Todos os valores monetários em reais (convertidos na borda);
 * somas internas em centavos inteiros para precisão.
 */
export async function getMonthlySummary(
  userId: string,
  month: string,
): Promise<MonthlySummary> {
  const { start, end } = monthRange(month);

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lt: end } },
    include: { category: true },
  });

  let totalExpenseCents = 0;
  let totalIncomeCents = 0;
  let viaWhatsappCount = 0;

  // Agrupamento de despesas por categoria (centavos).
  interface CatAgg {
    categoryId: string;
    name: string;
    icon: string;
    color: string;
    totalCents: number;
  }
  const byCategoryMap = new Map<string, CatAgg>();
  const UNCATEGORIZED = '__uncategorized__';

  // Agrupamento de despesas por dia (centavos).
  const dailyMap = new Map<string, number>();

  for (const t of transactions) {
    if (t.source === 'WHATSAPP') viaWhatsappCount += 1;

    if (t.type === 'INCOME') {
      totalIncomeCents += t.amountCents;
      continue;
    }

    // EXPENSE
    totalExpenseCents += t.amountCents;

    const key = t.categoryId ?? UNCATEGORIZED;
    const existing = byCategoryMap.get(key);
    if (existing) {
      existing.totalCents += t.amountCents;
    } else {
      byCategoryMap.set(key, {
        categoryId: t.categoryId ?? '',
        name: t.category?.name ?? 'Sem categoria',
        icon: t.category?.icon ?? 'ti-help',
        color: t.category?.color ?? '#6b7280',
        totalCents: t.amountCents,
      });
    }

    const dk = dayKey(t.date);
    dailyMap.set(dk, (dailyMap.get(dk) ?? 0) + t.amountCents);
  }

  const byCategory: MonthlySummaryByCategory[] = Array.from(byCategoryMap.values())
    .sort((a, b) => b.totalCents - a.totalCents)
    .map((c) => ({
      categoryId: c.categoryId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      total: centsToReais(c.totalCents),
      pct: totalExpenseCents === 0 ? 0 : c.totalCents / totalExpenseCents,
    }));

  // Série diária cobrindo cada dia do mês [start, end).
  const daily: MonthlySummaryDaily[] = [];
  for (let d = new Date(start); d < end; d = new Date(d.getTime() + 86400000)) {
    const dk = dayKey(d);
    daily.push({ date: dk, expense: centsToReais(dailyMap.get(dk) ?? 0) });
  }

  return {
    month,
    totalExpense: centsToReais(totalExpenseCents),
    totalIncome: centsToReais(totalIncomeCents),
    balance: centsToReais(totalIncomeCents - totalExpenseCents),
    viaWhatsappCount,
    byCategory,
    daily,
  };
}

/** Escapa um campo para CSV (envolve em aspas se tiver vírgula, aspas ou quebra de linha). */
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Monta um CSV (com BOM UTF-8, para abrir corretamente no Excel) a partir de
 * transações já serializadas. Valor em formato brasileiro (vírgula decimal).
 */
export function buildTransactionsCsv(transactions: SerializedTransaction[]): string {
  const header = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Origem', 'Valor'];
  const rows = transactions.map((t) => [
    new Date(t.date).toISOString().slice(0, 10),
    t.description,
    t.category?.name ?? '',
    t.type === 'INCOME' ? 'Receita' : 'Despesa',
    t.source,
    t.amount.toFixed(2).replace('.', ','),
  ]);
  const lines = [header, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(','));
  return '\uFEFF' + lines.join('\r\n');
}
