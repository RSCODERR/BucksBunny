import { Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database';
import { env } from '../config/env';

export const getHealth = (_req: Request, res: Response): void => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    success: true,
    data: {
      name: 'BucksBunny API',
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      database: dbStatus,
    },
  });
};
