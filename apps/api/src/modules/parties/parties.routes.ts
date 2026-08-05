import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/validate.js';
import { successResponse } from '../../common/response.js';
import { createPartySchema, updatePartySchema } from '@scrap-erp/shared-types';
import {
  listParties,
  getPartyById,
  createParty,
  updateParty,
  deactivateParty,
  getPartyBalance,
  getPartyLedger,
} from './parties.service.js';

const listQuerySchema = z.object({
  search: z.string().optional(),
  isSupplier: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  isCustomer: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === 'false' ? false : true)), // default active
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function partiesRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  // GET /api/v1/parties
  app.get('/', async (request, _reply) => {
    const query = validate(listQuerySchema, request.query);
    const result = await listParties(app.prisma, query);
    return successResponse(result);
  });

  // GET /api/v1/parties/:id/balance
  app.get<{ Params: { id: string } }>('/:id/balance', async (request, _reply) => {
    return successResponse(await getPartyBalance(app.prisma, request.params.id));
  });

  // GET /api/v1/parties/:id/ledger
  app.get<{ Params: { id: string } }>('/:id/ledger', async (request, _reply) => {
    const query = validate(
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      }),
      request.query,
    );
    return successResponse(await getPartyLedger(app.prisma, request.params.id, query));
  });

  // GET /api/v1/parties/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    const party = await getPartyById(app.prisma, request.params.id);
    return successResponse(party);
  });

  // POST /api/v1/parties
  app.post('/', async (request, _reply) => {
    const data = validate(createPartySchema, request.body);
    const party = await createParty(app.prisma, data);
    return successResponse(party, 'Party created successfully');
  });

  // PATCH /api/v1/parties/:id
  app.patch<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    const data = validate(updatePartySchema, request.body);
    const party = await updateParty(app.prisma, request.params.id, data);
    return successResponse(party, 'Party updated successfully');
  });

  // DELETE /api/v1/parties/:id — Admin only
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireRole(['ADMIN'])] },
    async (request, _reply) => {
      await deactivateParty(app.prisma, request.params.id);
      return successResponse(null, 'Party deactivated successfully');
    },
  );
}
