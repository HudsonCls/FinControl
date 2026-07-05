import type { Category } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { aiEnabled, env, isTest } from '../../config/env';
import { normalizeText } from './parser';

/** Mapa de palavras-chave -> nome de categoria padrão (fallback sem IA). */
const KEYWORDS: Record<string, string[]> = {
  Alimentação: [
    'ifood', 'mercado', 'supermercado', 'padaria', 'restaurante', 'lanche', 'comida',
    'almoco', 'jantar', 'pizza', 'burger', 'hamburguer', 'food', 'acai', 'cafe', 'rappi',
    'paçoca', 'doce', 'salgado', 'bolo', 'sorvete', 'chocolate', 'pastel', 'sushi',
    'marmita', 'feira', 'açougue', 'bebida', 'cerveja', 'refrigerante',
  ],
  Transporte: [
    // '99' foi removido: como palavra inteira ele casa com valores ("gastei 99 no...").
    'uber', 'gasolina', 'posto', 'combustivel', 'onibus', 'metro', 'passagem',
    'estacionamento', 'shell', 'ipiranga', 'pedagio', 'bilhete',
  ],
  Moradia: [
    'aluguel', 'condominio', 'luz', 'energia', 'agua', 'internet', 'gas', 'iptu', 'wifi',
  ],
  Lazer: [
    'netflix', 'spotify', 'cinema', 'show', 'bar', 'viagem', 'jogo', 'game', 'steam',
    'disney', 'hbo', 'prime', 'balada', 'ingresso',
  ],
  Saúde: [
    'farmacia', 'remedio', 'medico', 'consulta', 'dentista', 'academia', 'plano',
    'exame', 'hospital', 'psicologo',
  ],
};

/**
 * Verifica se o termo aparece como PALAVRA INTEIRA no texto normalizado.
 * Substring solta causava falsos positivos: "gas" (Moradia) batia dentro
 * de "GAStei", mandando qualquer gasto sem palavra-chave para Moradia.
 */
function hasWholeWord(text: string, term: string): boolean {
  const escaped = normalizeText(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

/** Acha o nome de categoria por nome direto no texto ou por palavra-chave. */
export function keywordCategoryName(text: string, categoryNames: string[]): string | null {
  const t = normalizeText(text);

  for (const name of categoryNames) {
    if (hasWholeWord(t, name)) return name;
  }

  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    if (kws.some((k) => hasWholeWord(t, k))) {
      const owned = categoryNames.find((n) => normalizeText(n) === normalizeText(cat));
      if (owned) return owned;
    }
  }
  return null;
}

/** Usa Claude para escolher a melhor categoria dentre as do usuário. Retorna null em erro. */
async function aiCategoryName(text: string, categoryNames: string[]): Promise<string | null> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const prompt =
      `Classifique o gasto a seguir em UMA destas categorias: ${categoryNames.join(', ')}.\n` +
      `Responda APENAS com o nome exato da categoria, sem pontuação.\n\nGasto: "${text}"`;
    const res = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 20,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = res.content?.[0];
    const answer = block && block.type === 'text' ? block.text.trim() : '';
    const match = categoryNames.find((n) => normalizeText(n) === normalizeText(answer));
    return match ?? null;
  } catch (err) {
    // Não derruba o fluxo (cai no fallback), mas registra: chave inválida ou
    // sem créditos apareceria aqui — silenciar esconderia a má configuração.
    if (!isTest) console.error('Categorização por IA falhou; usando fallback:', err);
    return null;
  }
}

/**
 * Detecção EXPLÍCITA de categoria mencionada no texto (por nome ou palavra-chave),
 * de forma DETERMINÍSTICA — sem IA e sem cair em "Outros". Retorna null quando
 * nenhuma categoria é mencionada. Usada por consultas ("quanto gastei em X"),
 * limites ("limite em X") e receitas — onde chutar uma categoria daria resultado errado.
 */
export async function findCategory(userId: string, text: string): Promise<Category | null> {
  const categories = await prisma.category.findMany({ where: { userId } });
  const chosen = keywordCategoryName(text, categories.map((c) => c.name));
  if (!chosen) return null;
  return categories.find((c) => normalizeText(c.name) === normalizeText(chosen)) ?? null;
}

/**
 * Categoriza uma DESPESA. Com a chave da Anthropic (aiEnabled), a IA decide a
 * categoria entre as de despesa do usuário; sem chave (ou em erro/sem match),
 * usa as palavras-chave; por fim, cai em "Outros". Só considera categorias de
 * despesa (uma receita como "Salário" nunca é atribuída a um gasto).
 */
export async function categorizeExpense(userId: string, text: string): Promise<Category | null> {
  const categories = await prisma.category.findMany({ where: { userId } });
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const names = expenseCategories.map((c) => c.name);

  let chosen: string | null = null;
  if (aiEnabled) chosen = await aiCategoryName(text, names);
  if (!chosen) chosen = keywordCategoryName(text, names);

  const matched = chosen
    ? expenseCategories.find((c) => normalizeText(c.name) === normalizeText(chosen!))
    : undefined;
  return matched ?? expenseCategories.find((c) => normalizeText(c.name) === 'outros') ?? null;
}
