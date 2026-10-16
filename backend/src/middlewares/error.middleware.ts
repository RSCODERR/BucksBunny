import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'An unexpected internal server error occurred.';
  let details: unknown = undefined;

  // Handle known operational application errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.message && err.message.includes('CORS')) {
    statusCode = 403;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Mongoose validation errors
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'CastError') {
    // Mongoose cast errors (invalid ObjectId, etc.)
    statusCode = 400;
    message = 'Resource not found or invalid identifier format.';
  } else if (err.message) {
    message = err.message;
  }

  // Log error in development or for 500 internal errors
  if (statusCode >= 500 || env.NODE_ENV === 'development') {
    console.error(`[Error] ${statusCode} - ${message}`);
    if (err.stack && env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(details !== undefined ? { details } : {}),
      ...(env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {}),
    },
  });
};
