import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/validate.js';
import { successResponse } from '../../common/response.js';
import { createVehicleSchema, updateVehicleSchema } from '@scrap-erp/shared-types';
import {
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deactivateVehicle,
} from './vehicles.service.js';

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function vehiclesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, _reply) => {
    const query = validate(listQuerySchema, request.query);
    return successResponse(await listVehicles(app.prisma, query));
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    return successResponse(await getVehicleById(app.prisma, request.params.id));
  });

  app.post('/', async (request, _reply) => {
    const data = validate(createVehicleSchema, request.body);
    return successResponse(await createVehicle(app.prisma, data), 'Vehicle created successfully');
  });

  app.patch<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    const data = validate(updateVehicleSchema, request.body);
    return successResponse(
      await updateVehicle(app.prisma, request.params.id, data),
      'Vehicle updated successfully',
    );
  });

  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireRole(['ADMIN'])] },
    async (request, _reply) => {
      await deactivateVehicle(app.prisma, request.params.id);
      return successResponse(null, 'Vehicle deactivated successfully');
    },
  );
}
