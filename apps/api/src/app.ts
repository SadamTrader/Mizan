import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import prismaPlugin from './plugins/prisma.js';
import { registerErrorHandler } from './common/errorHandler.js';
import { successResponse } from './common/response.js';

export async function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
            },
          }
        : true, // JSON in production
  });

  // ── Security headers ─────────────────────────────────────────────────────────
  await app.register(helmet, {
    // Content-Security-Policy is relaxed slightly for API-only usage
    contentSecurityPolicy: false,
  });

  // ── CORS ─────────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin:
      env.NODE_ENV === 'production'
        ? env.APP_URL
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Global rate limit ────────────────────────────────────────────────────────
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ── Database ─────────────────────────────────────────────────────────────────
  await app.register(prismaPlugin);

  // ── Error handler (must register after plugins) ──────────────────────────────
  registerErrorHandler(app);

  // ── Routes ───────────────────────────────────────────────────────────────────
  app.get('/health', async (request, _reply) => {
    // Quick DB connectivity check
    await request.server.prisma.warehouse.count();
    return successResponse({ status: 'ok', database: 'connected' });
  });

  return app;
}
