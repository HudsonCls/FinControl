import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import * as service from './budgets.service';
import {
  listAlertsQuery,
  updateAlertSchema,
  alertIdParam,
} from './budgets.schemas';

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

alertsRouter.get(
  '/',
  validate({ query: listAlertsQuery }),
  asyncHandler(async (req, res) => {
    const read = req.query.read as boolean | undefined;
    const data = await service.listAlerts(req.userId!, read);
    res.json({ data });
  }),
);

alertsRouter.patch(
  '/:id',
  validate({ params: alertIdParam, body: updateAlertSchema }),
  asyncHandler(async (req, res) => {
    const { read } = req.body as { read: boolean };
    const data = await service.setAlertRead(req.userId!, req.params.id, read);
    res.json({ data });
  }),
);

alertsRouter.delete(
  '/:id',
  validate({ params: alertIdParam }),
  asyncHandler(async (req, res) => {
    await service.deleteAlert(req.userId!, req.params.id);
    res.status(204).send();
  }),
);
