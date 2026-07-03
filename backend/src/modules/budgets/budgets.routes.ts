import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { currentMonth } from '../../lib/dates';
import * as service from './budgets.service';
import {
  setBudgetSchema,
  listBudgetsQuery,
  budgetIdParam,
} from './budgets.schemas';

export const budgetsRouter = Router();
budgetsRouter.use(requireAuth);

budgetsRouter.get(
  '/',
  validate({ query: listBudgetsQuery }),
  asyncHandler(async (req, res) => {
    const month = (req.query.month as string | undefined) ?? currentMonth();
    const data = await service.getBudgetsStatus(req.userId!, month);
    res.json({ data });
  }),
);

budgetsRouter.post(
  '/',
  validate({ body: setBudgetSchema }),
  asyncHandler(async (req, res) => {
    const { categoryId, month, limit } = req.body as {
      categoryId: string;
      month: string;
      limit: number;
    };
    const data = await service.setBudget(req.userId!, categoryId, month, limit);
    res.status(201).json({ data });
  }),
);

budgetsRouter.put(
  '/',
  validate({ body: setBudgetSchema }),
  asyncHandler(async (req, res) => {
    const { categoryId, month, limit } = req.body as {
      categoryId: string;
      month: string;
      limit: number;
    };
    const data = await service.setBudget(req.userId!, categoryId, month, limit);
    res.json({ data });
  }),
);

budgetsRouter.delete(
  '/:id',
  validate({ params: budgetIdParam }),
  asyncHandler(async (req, res) => {
    await service.deleteBudget(req.userId!, req.params.id);
    res.status(204).send();
  }),
);
