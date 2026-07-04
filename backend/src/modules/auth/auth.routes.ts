import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginRateLimiter } from '../../middleware/rateLimit';
import { asyncHandler } from '../../lib/asyncHandler';
import * as service from './auth.service';
import { registerSchema, loginSchema, updateMeSchema } from './auth.schemas';

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
