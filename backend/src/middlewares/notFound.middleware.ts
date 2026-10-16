import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Endpoint not found: [${req.method}] ${req.originalUrl}`, 404));
};
