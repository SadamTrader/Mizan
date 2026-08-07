import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/validate.js';
import { successResponse } from '../../common/response.js';
import {
  getDashboardSummary,
  getSalesTrend,
  getPurchasesTrend,
  getTopItems,
  getTopParties,
} from './dashboard.service.js';

const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const trendSchema = dateRangeSchema.extend({
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

const topSchema = dateRangeSchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/summary', async (request, _reply) => {
    const q = validate(dateRangeSchema, request.query);
    return successResponse(await getDashboardSummary(app.prisma, q));
  });

  app.get('/sales-trend', async (request, _reply) => {
    const q = validate(trendSchema, request.query);
    return successResponse(await getSalesTrend(app.prisma, q));
  });

  app.get('/purchases-trend', async (request, _reply) => {
    const q = validate(trendSchema, request.query);
    return successResponse(await getPurchasesTrend(app.prisma, q));
  });

  app.get('/top-items', async (request, _reply) => {
    const q = validate(topSchema, request.query);
    return successResponse(await getTopItems(app.prisma, q));
  });

  app.get('/top-parties', async (request, _reply) => {
    const q = validate(
      topSchema.extend({ type: z.enum(['customer', 'supplier']).default('customer') }),
      request.query,
    );
    return successResponse(await getTopParties(app.prisma, q));
  });
}
