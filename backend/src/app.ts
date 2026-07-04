import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { isTest, env } from './config/env';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

import { authRouter } from './modules/auth/auth.routes';
import { categoriesRouter } from './modules/categories/categories.routes';
import { accountsRouter } from './modules/accounts/accounts.routes';
import { transactionsRouter } from './modules/transactions/transactions.routes';
import { budgetsRouter } from './modules/budgets/budgets.routes';
import { alertsRouter } from './modules/budgets/alerts.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { chatRouter } from './modules/chat/chat.routes';
import { whatsappRouter } from './modules/whatsapp/whatsapp.routes';

export function createApp(): Application {
  const app = express();

  // Confia no primeiro proxy (Render) para que req.ip reflita o IP real do
  // cliente — necessário para o rate limiter funcionar por usuário, não globalmente.
  app.set('trust proxy', 1);

  app.use(helmet());
  // CORS_ORIGIN pode ser "*" (padrão) ou uma lista separada por vírgula com as origens permitidas.
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    }),
  );
  app.use(express.json());
  // Twilio envia o webhook como application/x-www-form-urlencoded (From/Body).
  app.use(express.urlencoded({ extended: false }));
  if (!isTest) app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok', service: 'fincontrol-backend' } });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/accounts', accountsRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/budgets', budgetsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/whatsapp', whatsappRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
