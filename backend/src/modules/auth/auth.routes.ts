import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginRateLimiter, sensitiveRateLimiter } from '../../middleware/rateLimit';
import { asyncHandler } from '../../lib/asyncHandler';
import * as service from './auth.service';
import {
  registerSchema,
  loginSchema,
  updateMeSchema,
  deleteMeSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schemas';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const data = await service.register(req.body);
    res.status(201).json({ data });
  }),
);

authRouter.post(
  '/login',
  loginRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const data = await service.login(req.body);
    res.json({ data });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await service.getMe(req.userId!);
    res.json({ data: { user } });
  }),
);

authRouter.patch(
  '/me',
  requireAuth,
  validate({ body: updateMeSchema }),
  asyncHandler(async (req, res) => {
    const user = await service.updateMe(req.userId!, req.body);
    res.json({ data: { user } });
  }),
);

authRouter.delete(
  '/me',
  requireAuth,
  validate({ body: deleteMeSchema }),
  asyncHandler(async (req, res) => {
    await service.deleteMe(req.userId!, (req.body as { password: string }).password);
    res.status(204).send();
  }),
);

authRouter.post(
  '/forgot',
  sensitiveRateLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(async (req, res) => {
    await service.startPasswordReset((req.body as { email: string }).email);
    // Resposta genérica sempre — não revela se o e-mail existe.
    res.json({ data: { message: 'Se o e-mail existir, enviamos um código de redefinição.' } });
  }),
);

authRouter.post(
  '/reset',
  sensitiveRateLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(async (req, res) => {
    const { email, code, newPassword } = req.body as {
      email: string;
      code: string;
      newPassword: string;
    };
    await service.resetPassword(email, code, newPassword);
    res.json({ data: { message: 'Senha redefinida com sucesso.' } });
  }),
);

authRouter.post(
  '/verify-email/send',
  requireAuth,
  sensitiveRateLimiter,
  asyncHandler(async (req, res) => {
    await service.startEmailVerification(req.userId!);
    res.json({ data: { message: 'Código de verificação enviado para o seu e-mail.' } });
  }),
);

authRouter.post(
  '/verify-email',
  requireAuth,
  sensitiveRateLimiter,
  validate({ body: verifyEmailSchema }),
  asyncHandler(async (req, res) => {
    const user = await service.verifyEmail(req.userId!, (req.body as { code: string }).code);
    res.json({ data: { user } });
  }),
);
