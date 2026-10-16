import express, { Application } from 'express';
import { corsMiddleware } from './middlewares/cors.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import { errorHandler } from './middlewares/error.middleware';
import appRouter from './routes';

export const createApp = (): Application => {
  const app: Application = express();

  // Security & CORS
  app.use(corsMiddleware);

  // Request body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Application Routes (e.g. /api/v1/health)
  app.use(appRouter);

  // 404 handler for undefined routes
  app.use(notFoundHandler);

  // Centralized error handling middleware
  app.use(errorHandler);

  return app;
};

export default createApp();
