import cors, { CorsOptions } from 'cors';
import { env } from '../config/env';

const allowedOrigin = env.CORS_ORIGIN.trim().replace(/\/$/, '');

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server, postman) where origin is undefined
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.trim().replace(/\/$/, '');
    if (normalizedOrigin === allowedOrigin) {
      return callback(null, true);
    }

    const error = new Error(`Access denied by CORS policy. Origin "${origin}" is not authorized.`);
    return callback(error, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions);
