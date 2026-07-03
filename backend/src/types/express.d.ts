import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware requireAuth. */
      userId?: string;
    }
  }
}

export {};
