import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { isTest } from '../config/env';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Dados inválidos', details: err.flatten().fieldErrors },
    });
    return;
  }
  const code = (err as { code?: string } | null)?.code;
  if (code === 'P2002') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Registro já existe' } });
    return;
  }
  if (code === 'P2025') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Registro não encontrado' } });
    return;
  }
  if (!isTest) console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Erro interno do servidor' } });
}
