import type { Transaction, Category, Account, ChatMessage } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { centsToReais, reaisToCents, formatBRL } from '../../lib/money';
import { currentMonth, daysRemainingInMonth } from '../../lib/dates';
import { parse } from './parser';
import { findCategory, categorizeExpense } from './categorizer';
import {
  searchTransactions,
  getMonthlySummary,
  type SerializedTransaction,
} from '../reports/reports.service';
import { setBudget, getBudgetsStatus, evaluateAlerts } from '../budgets/budgets.service';

type TxWithRelations = Transaction & { category: Category | null; account: Account | null };

function serializeTx(t: TxWithRelations): SerializedTransaction {
  return {
    id: t.id,
    description: t.description,
    amount: centsToReais(t.amountCents),
    type: t.type,
    date: t.date,
    source: t.source,
    notes: t.notes,
    category: t.category
      ? { id: t.category.id, name: t.category.name, icon: t.category.icon, color: t.category.color }
      : null,
    account: t.account ? { id: t.account.id, name: t.account.name } : null,
  };
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export interface ChatResult {
  reply: string;
  message: ChatMessage;
  transaction?: SerializedTransaction;
}

/**
 * Processa uma mensagem em linguagem natural: registra gasto/receita, responde
 * consultas ("quanto gastei em X") ou define limites. Persiste o diálogo.
 */
export async function processMessage(
  userId: string,
  content: string,
  channel: 'APP' | 'WHATSAPP' = 'APP',
): Promise<ChatResult> {
  await prisma.chatMessage.create({ data: { userId, role: 'USER', content, channel } });

  const parsed = parse(content);
  let reply = '';
  let transactionId: string | null = null;
  let transaction: SerializedTransaction | undefined;

  switch (parsed.intent) {
    case 'ADD_EXPENSE':
    case 'ADD_INCOME': {
      if (!parsed.amountCents) {
        reply = 'Não consegui identificar o valor. Tente algo como "gastei 42,90 no iFood".';
        break;
      }
      const isIncome = parsed.intent === 'ADD_INCOME';
      const category = isIncome
        ? await findCategory(userId, content)
        : await categorizeExpense(userId, content);

      const tx = await prisma.transaction.create({
        data: {
          userId,
          description: parsed.description || category?.name || (isIncome ? 'Receita' : 'Gasto'),
          amountCents: parsed.amountCents,
          type: isIncome ? 'INCOME' : 'EXPENSE',
          categoryId: category?.id ?? null,
          source: channel,
        },
        include: { category: true, account: true },
      });
      transactionId = tx.id;
      transaction = serializeTx(tx);

      const valor = formatBRL(parsed.amountCents);
      if (isIncome) {
        reply = `Receita anotada! ${valor}${category ? ` em ${category.name}` : ''}.`;
        break;
      }

      reply = `Anotado! ${valor}${category ? ` em ${category.name}` : ''}.`;
      const month = currentMonth();
      const newAlerts = await evaluateAlerts(userId, month);
      if (category) {
        const status = (await getBudgetsStatus(userId, month)).find(
          (s) => s.categoryId === category.id,
        );
        if (status) {
          reply +=
            ` ${category.name}: ${formatBRL(reaisToCents(status.spent))} de ` +
            `${formatBRL(reaisToCents(status.limit))} (${Math.round(status.pct * 100)}%).`;
        }
        const mine = newAlerts.find((a) => a.categoryId === category.id);
        if (mine) reply += ` ⚠ ${mine.message}.`;
      }
      break;
    }

    case 'QUERY_SPENT': {
      const month = currentMonth();
      const category = await findCategory(userId, content);
      if (category) {
        const r = await searchTransactions(userId, {
          categoryName: category.name,
          month,
          type: 'EXPENSE',
        });
        reply =
          `Em ${category.name} (${monthLabel(month)}) você gastou ${formatBRL(r.totalCents)} ` +
          `em ${r.count} lançamento(s).`;
      } else {
        const s = await getMonthlySummary(userId, month);
        reply =
          `Em ${monthLabel(month)}: gastos ${formatBRL(reaisToCents(s.totalExpense))}, ` +
          `receitas ${formatBRL(reaisToCents(s.totalIncome))}, ` +
          `saldo ${formatBRL(reaisToCents(s.balance))}.`;
      }
      break;
    }

    case 'SET_LIMIT': {
      const category = await findCategory(userId, content);
      if (!category || !parsed.amountCents) {
        reply = 'Diga a categoria e o valor do limite. Ex: "limite de 500 em lazer".';
        break;
      }
      const month = currentMonth();
      await setBudget(userId, category.id, month, centsToReais(parsed.amountCents));
      reply =
        `Limite de ${formatBRL(parsed.amountCents)} definido para ${category.name} ` +
        `em ${monthLabel(month)}.`;
      break;
    }

    case 'DELETE_LAST': {
      const last = await prisma.transaction.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      });
      if (!last) {
        reply = 'Não encontrei nenhum lançamento para apagar.';
        break;
      }
      await prisma.transaction.delete({ where: { id: last.id } });
      reply =
        `Apaguei: ${last.description} — ${formatBRL(last.amountCents)}` +
        `${last.category ? ` em ${last.category.name}` : ''}.`;
      break;
    }

    case 'EDIT_LAST_AMOUNT': {
      if (!parsed.amountCents) {
        reply = 'Me diga o novo valor. Ex: "corrige pra 35,50".';
        break;
      }
      const last = await prisma.transaction.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { category: true, account: true },
      });
      if (!last) {
        reply = 'Não encontrei nenhum lançamento recente para corrigir.';
        break;
      }
      const oldAmount = formatBRL(last.amountCents);
      const updated = await prisma.transaction.update({
        where: { id: last.id },
        data: { amountCents: parsed.amountCents },
        include: { category: true, account: true },
      });
      transactionId = updated.id;
      transaction = serializeTx(updated);
      reply =
        `Corrigido! ${updated.description} agora é ${formatBRL(parsed.amountCents)} ` +
        `(era ${oldAmount}).`;

      if (updated.type === 'EXPENSE' && updated.categoryId) {
        const newAlerts = await evaluateAlerts(userId, currentMonth());
        const mine = newAlerts.find((a) => a.categoryId === updated.categoryId);
        if (mine) reply += ` ⚠ ${mine.message}.`;
      }
      break;
    }

    case 'PACE_QUERY': {
      const month = currentMonth();
      const s = await getMonthlySummary(userId, month);
      const days = Math.max(daysRemainingInMonth(month), 1);
      if (s.balance <= 0) {
        reply =
          `Seu saldo livre em ${monthLabel(month)} já está em ${formatBRL(reaisToCents(s.balance))}. ` +
          'Não sobrou margem para gastar sem estourar o orçamento do mês.';
      } else {
        const dailyPace = s.balance / days;
        reply =
          `Você ainda tem ${formatBRL(reaisToCents(s.balance))} de saldo livre em ${monthLabel(month)}, ` +
          `com ${days} dia(s) restante(s). Isso dá cerca de ${formatBRL(reaisToCents(dailyPace))}/dia ` +
          `(≈ ${formatBRL(reaisToCents(dailyPace * 7))}/semana) sem estourar o mês.`;
      }
      break;
    }

    default:
      reply =
        'Oi! Me diga um gasto ("gastei 42,90 no iFood"), pergunte ' +
        '"quanto gastei em alimentação?" ou defina um limite ("limite de 500 em lazer").';
  }

  const message = await prisma.chatMessage.create({
    data: { userId, role: 'ASSISTANT', content: reply, channel, transactionId },
  });

  return { reply, message, transaction };
}

/** Histórico de mensagens do usuário (ordem cronológica). */
export async function getHistory(userId: string, limit = 100): Promise<ChatMessage[]> {
  return prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}
