import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { currentMonth } from '../../lib/dates';
import * as service from './reports.service';
import { summaryQuery, byCategoryQuery, searchQuery } from './reports.schemas';
import type { SummaryQuery, ByCategoryQuery, SearchQuery } from './reports.schemas';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.get(
  '/summary',
  validate({ query: summaryQuery }),
  asyncHandler(async (req, res) => {
    const { month } = req.query as SummaryQuery;
    const data = await service.getMonthlySummary(req.userId!, month ?? currentMonth());
    res.json({ data });
  }),
);

reportsRouter.get(
  '/search',
  validate({ query: searchQuery }),
  asyncHandler(async (req, res) => {
    const { category, q, from, to, type, month, source } = req.query as SearchQuery;
    const result = await service.searchTransactions(req.userId!, {
      // "category" pode ser id ou nome: tentamos como id; se não casar, o
      // service cai para resolução por nome (case-insensitive).
      categoryId: category,
      categoryName: category,
      q,
      from,
      to,
      type,
      month,
      source,
    });
    res.json({
      data: {
        total: result.totalReais,
        count: result.count,
        transactions: result.transactions,
      },
    });
  }),
);

reportsRouter.get(
  '/by-category',
  validate({ query: byCategoryQuery }),
  asyncHandler(async (req, res) => {
    const { month } = req.query as ByCategoryQuery;
    const summary = await service.getMonthlySummary(req.userId!, month ?? currentMonth());
    res.json({ data: summary.byCategory });
  }),
);
