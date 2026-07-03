import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import * as service from './transactions.service';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdParam,
  listTransactionsQuery,
} from './transactions.schemas';
import type { ListTransactionsFilter } from './transactions.schemas';

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

transactionsRouter.get(
  '/',
  validate({ query: listTransactionsQuery }),
  asyncHandler(async (req, res) => {
    const result = await service.listTransactions(
      req.userId!,
      req.query as unknown as ListTransactionsFilter,
    );
    res.json(result);
  }),
);

transactionsRouter.post(
  '/',
  validate({ body: createTransactionSchema }),
  asyncHandler(async (req, res) => {
    const data = await service.createTransaction(req.userId!, req.body);
    res.status(201).json({ data });
  }),
);

transactionsRouter.get(
  '/:id',
  validate({ params: transactionIdParam }),
  asyncHandler(async (req, res) => {
    const data = await service.getTransaction(req.userId!, req.params.id);
    res.json({ data });
  }),
);

transactionsRouter.patch(
  '/:id',
  validate({ params: transactionIdParam, body: updateTransactionSchema }),
  asyncHandler(async (req, res) => {
    const data = await service.updateTransaction(req.userId!, req.params.id, req.body);
    res.json({ data });
  }),
);

transactionsRouter.delete(
  '/:id',
  validate({ params: transactionIdParam }),
  asyncHandler(async (req, res) => {
    await service.deleteTransaction(req.userId!, req.params.id);
    res.status(204).send();
  }),
);
