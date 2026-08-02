import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/validate.js';
import { successResponse } from '../../common/response.js';
import { createPurchaseSchema } from '@scrap-erp/shared-types';
import {
  createPurchase,
  listPurchases,
  getPurchaseById,
  cancelPurchase,
} from './purchases.service.js';

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

export async function purchasesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /api/v1/purchases
  app.get('/', async (request, _reply) => {
    const query = validate(listQuerySchema, request.query);
    return successResponse(await listPurchases(app.prisma, query));
  });

  // GET /api/v1/purchases/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    return successResponse(await getPurchaseById(app.prisma, request.params.id));
  });

  // POST /api/v1/purchases
  app.post('/', async (request, reply) => {
    const data = validate(createPurchaseSchema, request.body);
    const purchase = await createPurchase(app.prisma, data, request.user.userId);
    return reply.status(201).send(successResponse(purchase, 'Purchase created successfully'));
  });

  // PATCH /api/v1/purchases/:id/cancel — Admin only
  app.patch<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: [requireRole(['ADMIN'])] },
    async (request, _reply) => {
      const purchase = await cancelPurchase(app.prisma, request.params.id, request.user.userId);
      return successResponse(purchase, 'Purchase cancelled successfully');
    },
  );
}
