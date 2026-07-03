import type { Category } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { aiEnabled, env } from '../../config/env';
import { normalizeText } from './parser';

/** Mapa de palavras-chave -> nome de categoria padrão (fallback sem IA). */
const KEYWORDS: Record<string, string[]> = {
  Alimentação: [
    'ifood', 'mercado', 'supermercado', 'padaria', 'restaurante', 'lanche', 'comida',
    'almoco', 'jantar', 'pizza', 'burger', 'hamburguer', 'food', 'acai', 'cafe', 'rappi',
  ],
  Transporte: [
    'uber', '99', 'gasolina', 'posto', 'combustivel', 'onibus', 'metro', 'passagem',
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

/** Acha o nome de categoria por nome direto no texto ou por palavra-chave. */
export function keywordCategoryName(text: string, categoryNames: string[]): string | null {
  const t = normalizeText(text);

  for (const name of categoryNames) {
    if (t.includes(normalizeText(name))) return name;
  }

  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    if (kws.some((k) => t.includes(normalizeText(k)))) {
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
  } catch {
    return null;
  }
}

/** Resolve uma categoria EXPLÍCITA (sem cair em "Outros"). Para consultas e limites. */
export async function findCategory(userId: string, text: string): Promise<Category | null> {
  const categories = await prisma.category.findMany({ where: { userId } });
  const names = categories.map((c) => c.name);
  let chosen = keywordCategoryName(text, names);
  if (!chosen && aiEnabled) chosen = await aiCategoryName(text, names);
  if (!chosen) return null;
  return categories.find((c) => normalizeText(c.name) === normalizeText(chosen!)) ?? null;
}

/** Categoriza uma DESPESA: tenta explícita; se falhar, cai em "Outros" (se existir). */
export async function categorizeExpense(userId: string, text: string): Promise<Category | null> {
  const explicit = await findCategory(userId, text);
  if (explicit) return explicit;
  const categories = await prisma.category.findMany({ where: { userId } });
  return categories.find((c) => normalizeText(c.name) === 'outros') ?? null;
}
