import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/validate.js';
import { successResponse } from '../../common/response.js';
import { createPaymentSchema } from '@scrap-erp/shared-types';
import { createPayment, listPayments, getPaymentById } from './payments.service.js';

const listQuerySchema = z.object({
  search: z.string().optional(),
  partyId: z.string().uuid().optional(),
  paymentType: z.enum(['SUPPLIER_PAYMENT', 'CUSTOMER_PAYMENT']).optional(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function paymentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /api/v1/payments
  app.get('/', async (request, _reply) => {
    const query = validate(listQuerySchema, request.query);
    return successResponse(await listPayments(app.prisma, query));
  });

  // GET /api/v1/payments/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    return successResponse(await getPaymentById(app.prisma, request.params.id));
  });

  // POST /api/v1/payments
  app.post('/', async (request, reply) => {
    const data = validate(createPaymentSchema, request.body);
    const payment = await createPayment(app.prisma, data, request.user.userId);
    return reply.status(201).send(successResponse(payment, 'Payment recorded successfully'));
  });

  // No DELETE/cancel — see payments.service.ts note for reasoning
}
