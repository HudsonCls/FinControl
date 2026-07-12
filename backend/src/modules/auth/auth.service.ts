import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { signToken } from '../../lib/jwt';
import { normalizePhone, PHONE_REGEX } from '../../lib/phone';
import { sendEmail } from '../../lib/mailer';
import { sendWhatsapp } from '../whatsapp/twilioAdapter';
import type { RegisterInput, LoginInput, UpdateMeInput } from './auth.schemas';

/** Código numérico de 6 dígitos + hash sha256 (curto demais para bcrypt valer a pena;
 * a proteção real é a expiração de 15min + rate limit no endpoint). */
function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}
const CODE_TTL_MS = 15 * 60 * 1000;

/** Normaliza e valida um telefone; lança se o formato não for E.164 (+DDI...). */
function normalizeOrThrow(raw: string): string {
  const normalized = normalizePhone(raw);
  if (!PHONE_REGEX.test(normalized)) {
    throw AppError.badRequest(
      'Telefone inválido. Use o formato internacional, ex: +5511999999999',
    );
  }
  return normalized;
}

export interface SerializedUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

function serialize(user: User): SerializedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
  };
}

/**
 * Categorias padrão criadas para toda conta nova — sem elas o categorizador
 * do chat/WhatsApp não tem para onde direcionar os gastos (inclusive "Outros",
 * usado como fallback quando nenhuma categoria específica é identificada).
 */
const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: 'ti-tools-kitchen-2', color: '#f59e0b', type: 'EXPENSE' },
  { name: 'Transporte', icon: 'ti-car', color: '#3b82f6', type: 'EXPENSE' },
  { name: 'Moradia', icon: 'ti-home', color: '#8b5cf6', type: 'EXPENSE' },
  { name: 'Lazer', icon: 'ti-device-tv', color: '#ec4899', type: 'EXPENSE' },
  { name: 'Saúde', icon: 'ti-heart', color: '#10b981', type: 'EXPENSE' },
  { name: 'Outros', icon: 'ti-tag', color: '#6b7280', type: 'EXPENSE' },
  { name: 'Salário', icon: 'ti-cash', color: '#16a34a', type: 'INCOME' },
];

export async function register(
  input: RegisterInput,
): Promise<{ user: SerializedUser; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw AppError.conflict('E-mail já cadastrado');

  const phone = input.phone ? normalizeOrThrow(input.phone) : null;
  if (phone) {
    const phoneTaken = await prisma.user.findUnique({ where: { phone } });
    if (phoneTaken) throw AppError.conflict('Telefone já vinculado a outra conta');
  }

  const password = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      password,
      phone,
      categories: { create: DEFAULT_CATEGORIES },
    },
  });

  return { user: serialize(user), token: signToken(user.id) };
}

export async function login(
  input: LoginInput,
): Promise<{ user: SerializedUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw AppError.unauthorized('Credenciais inválidas');

  const ok = await bcrypt.compare(input.password, user.password);
  if (!ok) throw AppError.unauthorized('Credenciais inválidas');

  return { user: serialize(user), token: signToken(user.id) };
}

export async function getMe(userId: string): Promise<SerializedUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('Usuário não encontrado');
  return serialize(user);
}

/** Atualiza nome e/ou telefone do usuário. phone: null desvincula do WhatsApp. */
export async function updateMe(userId: string, input: UpdateMeInput): Promise<SerializedUser> {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw AppError.notFound('Usuário não encontrado');

  let phone: string | null | undefined;
  if (input.phone === null) {
    phone = null;
  } else if (input.phone !== undefined) {
    phone = normalizeOrThrow(input.phone);
    if (phone !== existing.phone) {
      const phoneTaken = await prisma.user.findUnique({ where: { phone } });
      if (phoneTaken) throw AppError.conflict('Telefone já vinculado a outra conta');
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(phone !== undefined ? { phone } : {}),
    },
  });
  return serialize(user);
}

/**
 * Exclui a conta e TODOS os dados (cascade no banco). Exige a senha atual —
 * um JWT roubado não basta para destruir a conta (requisito das lojas).
 */
export async function deleteMe(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('Usuário não encontrado');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw AppError.unauthorized('Senha incorreta');
  await prisma.user.delete({ where: { id: userId } });
}

/**
 * Inicia o "esqueci minha senha": gera código de 6 dígitos (15min) e envia
 * por e-mail (se configurado) e por WhatsApp (se vinculado). Não revela se o
 * e-mail existe — a rota sempre responde 200 genérico.
 */
export async function startPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const code = generateCode();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetCodeHash: hashCode(code),
      resetCodeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  const text = `Seu código para redefinir a senha do Avora é: ${code} (válido por 15 minutos). Se não foi você, ignore esta mensagem.`;
  await sendEmail(user.email, 'Avora — redefinição de senha', text);
  if (user.phone) await sendWhatsapp(user.phone, text);
}

/** Conclui o reset: valida o código e troca a senha. */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  const valid =
    user &&
    user.resetCodeHash &&
    user.resetCodeExpiresAt &&
    user.resetCodeExpiresAt > new Date() &&
    user.resetCodeHash === hashCode(code);
  if (!valid) throw AppError.badRequest('Código inválido ou expirado');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(newPassword, 10),
      resetCodeHash: null,
      resetCodeExpiresAt: null,
    },
  });
}

/** Envia (ou reenvia) o código de verificação do e-mail do usuário logado. */
export async function startEmailVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('Usuário não encontrado');
  if (user.emailVerifiedAt) throw AppError.badRequest('E-mail já verificado');

  const code = generateCode();
  await prisma.user.update({
    where: { id: userId },
    data: {
      verifyCodeHash: hashCode(code),
      verifyCodeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  const text = `Seu código de verificação do Avora é: ${code} (válido por 15 minutos).`;
  await sendEmail(user.email, 'Avora — confirme seu e-mail', text);
  if (user.phone) await sendWhatsapp(user.phone, text);
}

/** Confirma o e-mail com o código recebido. */
export async function verifyEmail(userId: string, code: string): Promise<SerializedUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const valid =
    user &&
    user.verifyCodeHash &&
    user.verifyCodeExpiresAt &&
    user.verifyCodeExpiresAt > new Date() &&
    user.verifyCodeHash === hashCode(code);
  if (!valid) throw AppError.badRequest('Código inválido ou expirado');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), verifyCodeHash: null, verifyCodeExpiresAt: null },
  });
  return serialize(updated);
}
