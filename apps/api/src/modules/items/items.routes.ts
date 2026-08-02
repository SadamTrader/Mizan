import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/validate.js';
import { successResponse } from '../../common/response.js';
import { createItemSchema, updateItemSchema } from '@scrap-erp/shared-types';
import { listItems, getItemById, createItem, updateItem, deactivateItem } from './items.service.js';
import { calculateCurrentStock } from '../../common/stock.js';

const listQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.string().optional().transform((v) => (v === 'false' ? false : true)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function itemsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, _reply) => {
    const query = validate(listQuerySchema, request.query);
    return successResponse(await listItems(app.prisma, query));
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    return successResponse(await getItemById(app.prisma, request.params.id));
  });

  // GET /api/v1/items/:id/stock?warehouseId=xxx
  // Returns current stock for this item in a given warehouse
  app.get<{ Params: { id: string }; Querystring: { warehouseId: string } }>(
    '/:id/stock',
    async (request, _reply) => {
      const { warehouseId } = request.query;
      const stock = await calculateCurrentStock(request.params.id, warehouseId, app.prisma as never);
      return successResponse({ itemId: request.params.id, warehouseId, stock: stock.toString() });
    },
  );

  app.post('/', async (request, _reply) => {
    const data = validate(createItemSchema, request.body);
    return successResponse(await createItem(app.prisma, data), 'Item created successfully');
  });

  app.patch<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    const data = validate(updateItemSchema, request.body);
    return successResponse(
      await updateItem(app.prisma, request.params.id, data),
      'Item updated successfully',
    );
  });

  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireRole(['ADMIN'])] },
    async (request, _reply) => {
      await deactivateItem(app.prisma, request.params.id);
      return successResponse(null, 'Item deactivated successfully');
    },
  );
}
