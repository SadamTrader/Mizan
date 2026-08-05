import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/validate.js';
import { successResponse } from '../../common/response.js';
import { createSaleSchema } from '@scrap-erp/shared-types';
import { createSale, listSales, getSaleById, cancelSale, getProfitReport } from './sales.service.js';

const listQuerySchema = z.object({
  search: z.string().optional(),
  partyId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function salesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /api/v1/sales/reports/profit — must be registered BEFORE /:id to avoid route conflict
  app.get(
    '/reports/profit',
    { preHandler: [requireRole(['ADMIN'])] },
    async (request, _reply) => {
      const schema = z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        partyId: z.string().uuid().optional(),
        warehouseId: z.string().uuid().optional(),
      });
      const query = validate(schema, request.query);
      return successResponse(await getProfitReport(app.prisma, query));
    },
  );

  // GET /api/v1/sales
  app.get('/', async (request, _reply) => {
    const query = validate(listQuerySchema, request.query);
    return successResponse(await listSales(app.prisma, query));
  });

  // GET /api/v1/sales/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    return successResponse(await getSaleById(app.prisma, request.params.id));
  });

  // POST /api/v1/sales
  app.post('/', async (request, reply) => {
    const data = validate(createSaleSchema, request.body);
    const sale = await createSale(app.prisma, data, request.user.userId);
    return reply.status(201).send(successResponse(sale, 'Sale created successfully'));
  });

  // PATCH /api/v1/sales/:id/cancel — Admin only
  app.patch<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: [requireRole(['ADMIN'])] },
    async (request, _reply) => {
      const sale = await cancelSale(app.prisma, request.params.id, request.user.userId);
      return successResponse(sale, 'Sale cancelled successfully');
    },
  );
}
