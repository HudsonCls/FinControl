import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import * as service from './chat.service';
import { postMessageSchema } from './chat.schemas';

export const chatRouter = Router();
chatRouter.use(requireAuth);

chatRouter.get(
  '/messages',
  asyncHandler(async (req, res) => {
    const data = await service.getHistory(req.userId!);
    res.json({ data });
  }),
);

chatRouter.post(
  '/messages',
  validate({ body: postMessageSchema }),
  asyncHandler(async (req, res) => {
    const { content, channel } = req.body as { content: string; channel?: 'APP' | 'WHATSAPP' };
    const data = await service.processMessage(req.userId!, content, channel ?? 'APP');
    res.status(201).json({ data });
  }),
);
