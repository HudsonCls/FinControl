import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import * as service from './accounts.service';
import { createAccountSchema, updateAccountSchema, accountIdParam } from './accounts.schemas';

export const accountsRouter = Router();
accountsRouter.use(requireAuth);

accountsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await service.listAccounts(req.userId!);
    res.json({ data });
  }),
);

accountsRouter.post(
  '/',
  validate({ body: createAccountSchema }),
  asyncHandler(async (req, res) => {
    const data = await service.createAccount(req.userId!, req.body);
    res.status(201).json({ data });
  }),
);

accountsRouter.get(
  '/:id',
  validate({ params: accountIdParam }),
  asyncHandler(async (req, res) => {
    const data = await service.getAccount(req.userId!, req.params.id);
    res.json({ data });
  }),
);

accountsRouter.patch(
  '/:id',
  validate({ params: accountIdParam, body: updateAccountSchema }),
  asyncHandler(async (req, res) => {
    const data = await service.updateAccount(req.userId!, req.params.id, req.body);
    res.json({ data });
  }),
);

accountsRouter.delete(
  '/:id',
  validate({ params: accountIdParam }),
  asyncHandler(async (req, res) => {
    await service.deleteAccount(req.userId!, req.params.id);
    res.status(204).send();
  }),
);
