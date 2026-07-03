import { PrismaClient } from '@prisma/client';
import { isTest } from '../config/env';

export const prisma = new PrismaClient({
  log: isTest ? [] : ['warn', 'error'],
});
