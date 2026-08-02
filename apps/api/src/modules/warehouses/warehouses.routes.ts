import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/validate.js';
import { successResponse } from '../../common/response.js';
import { createWarehouseSchema, updateWarehouseSchema } from '@scrap-erp/shared-types';
import {
  listWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deactivateWarehouse,
} from './warehouses.service.js';

const listQuerySchema = z.object({
  isActive: z.string().optional().transform((v) => (v === 'false' ? false : true)),
});

export async function warehousesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, _reply) => {
    const query = validate(listQuerySchema, request.query);
    return successResponse(await listWarehouses(app.prisma, query));
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    return successResponse(await getWarehouseById(app.prisma, request.params.id));
  });

  app.post('/', async (request, _reply) => {
    const data = validate(createWarehouseSchema, request.body);
    return successResponse(await createWarehouse(app.prisma, data), 'Warehouse created successfully');
  });

  app.patch<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    const data = validate(updateWarehouseSchema, request.body);
    return successResponse(
      await updateWarehouse(app.prisma, request.params.id, data),
      'Warehouse updated successfully',
    );
  });

  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireRole(['ADMIN'])] },
    async (request, _reply) => {
      await deactivateWarehouse(app.prisma, request.params.id);
      return successResponse(null, 'Warehouse deactivated successfully');
    },
  );
}
