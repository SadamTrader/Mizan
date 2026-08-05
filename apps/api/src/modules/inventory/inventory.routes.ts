import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/validate.js';
import { successResponse } from '../../common/response.js';
import {
  listStockByWarehouse,
  getStockMovementHistory,
  createManualAdjustment,
} from './inventory.service.js';

const adjustmentSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  warehouseId: z.string().uuid('Invalid warehouse ID'),
  quantity: z.number().refine((v) => v !== 0, 'Quantity cannot be zero'),
  reason: z.string().min(1, 'Reason is required'),
  adjustmentDate: z.string().optional(),
});

export async function inventoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /api/v1/inventory/stock?warehouseId=&search=&page=&limit=
  app.get('/stock', async (request, _reply) => {
    const query = validate(
      z.object({
        warehouseId: z.string().uuid('Invalid warehouse ID'),
        search: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
      request.query,
    );
    return successResponse(
      await listStockByWarehouse(app.prisma, query.warehouseId, query),
    );
  });

  // GET /api/v1/inventory/movements?itemId=&warehouseId=&from=&to=&page=&limit=
  app.get('/movements', async (request, _reply) => {
    const query = validate(
      z.object({
        itemId: z.string().uuid('Invalid item ID'),
        warehouseId: z.string().uuid('Invalid warehouse ID'),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      }),
      request.query,
    );
    return successResponse(
      await getStockMovementHistory(app.prisma, query.itemId, query.warehouseId, query),
    );
  });

  // POST /api/v1/inventory/adjustments — Admin only
  app.post(
    '/adjustments',
    { preHandler: [requireRole(['ADMIN'])] },
    async (request, _reply) => {
      const data = validate(adjustmentSchema, request.body);
      const result = await createManualAdjustment(app.prisma, data, request.user.userId);
      return successResponse(result, 'Manual adjustment recorded successfully');
    },
  );
}
