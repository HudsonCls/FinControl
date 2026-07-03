import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import * as service from './categories.service';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParam,
  listCategoriesQuery,
} from './categories.schemas';

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get(
  '/',
  validate({ query: listCategoriesQuery }),
  asyncHandler(async (req, res) => {
    const data = await service.listCategories(req.userId!, req.query as { type?: 'EXPENSE' | 'INCOME' });
    res.json({ data });
  }),
);

categoriesRouter.post(
  '/',
  validate({ body: createCategorySchema }),
  asyncHandler(async (req, res) => {
    const data = await service.createCategory(req.userId!, req.body);
    res.status(201).json({ data });
  }),
);

categoriesRouter.get(
  '/:id',
  validate({ params: categoryIdParam }),
  asyncHandler(async (req, res) => {
    const data = await service.getCategory(req.userId!, req.params.id);
    res.json({ data });
  }),
);

categoriesRouter.patch(
  '/:id',
  validate({ params: categoryIdParam, body: updateCategorySchema }),
  asyncHandler(async (req, res) => {
    const data = await service.updateCategory(req.userId!, req.params.id, req.body);
    res.json({ data });
  }),
);

categoriesRouter.delete(
  '/:id',
  validate({ params: categoryIdParam }),
  asyncHandler(async (req, res) => {
    await service.deleteCategory(req.userId!, req.params.id);
    res.status(204).send();
  }),
);
