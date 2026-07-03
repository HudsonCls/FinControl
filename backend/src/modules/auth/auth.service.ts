import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { signToken } from '../../lib/jwt';
import { normalizePhone, PHONE_REGEX } from '../../lib/phone';
import type { RegisterInput, LoginInput, UpdateMeInput } from './auth.schemas';

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
  createdAt: Date;
}

function serialize(user: User): SerializedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    createdAt: user.createdAt,
  };
}

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
    data: { email: input.email, name: input.name, password, phone },
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
