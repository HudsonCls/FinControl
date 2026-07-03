import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { env } from '../../config/env';
import * as service from './whatsapp.service';
import { incomingSchema } from './whatsapp.schemas';

export const whatsappRouter = Router();

/**
 * Verificação do webhook (estilo Meta/WhatsApp Cloud API).
 * GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 */
whatsappRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

/**
 * Recebe mensagens. Em produção, valide a assinatura do provedor antes de processar.
 * Corpo simulado: { from?, text, userId? } | Twilio: { From, Body }.
 */
whatsappRouter.post(
  '/webhook',
  validate({ body: incomingSchema }),
  asyncHandler(async (req, res) => {
    // Se um segredo estiver configurado, exige ?token=<secret> na URL do webhook.
    if (env.WHATSAPP_WEBHOOK_SECRET && req.query.token !== env.WHATSAPP_WEBHOOK_SECRET) {
      res.sendStatus(403);
      return;
    }
    const body = req.body as {
      from?: string;
      text?: string;
      userId?: string;
      From?: string;
      Body?: string;
    };
    const result = await service.processIncoming({
      from: body.from ?? body.From,
      text: (body.text ?? body.Body)!,
      userId: body.userId,
    });
    res.status(200).json({ data: result });
  }),
);
