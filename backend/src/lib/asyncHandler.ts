import { Request, Response, NextFunction, RequestHandler } from 'express';

/** Envolve handlers async para encaminhar rejeições ao errorHandler do Express. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
