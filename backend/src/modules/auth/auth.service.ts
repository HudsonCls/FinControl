import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { signToken } from '../../lib/jwt';
import type { RegisterInput, LoginInput } from './auth.schemas';

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

  const password = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      password,
      phone: input.phone ?? null,
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
