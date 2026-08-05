import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/validate.js';
import { successResponse } from '../../common/response.js';
import { createExpenseSchema, updateExpenseSchema } from '@scrap-erp/shared-types';
import {
  createExpense, listExpenses, getExpenseById, updateExpense, deleteExpense,
} from './expenses.service.js';

const listQuerySchema = z.object({
  search: z.string().optional(),
  category: z.enum(['RENT', 'SALARY', 'FUEL', 'UTILITIES', 'MAINTENANCE', 'OTHER']).optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function expensesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /api/v1/expenses
  app.get('/', async (request, _reply) => {
    const query = validate(listQuerySchema, request.query);
    return successResponse(await listExpenses(app.prisma, query));
  });

  // GET /api/v1/expenses/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, _reply) => {
    return successResponse(await getExpenseById(app.prisma, request.params.id));
  });

  // POST /api/v1/expenses — Admin only
  app.post(
    '/',
    { preHandler: [requireRole(['ADMIN'])] },
    async (request, reply) => {
      const data = validate(createExpenseSchema, request.body);
      const expense = await createExpense(app.prisma, data, request.user.userId);
      return reply.status(201).send(successResponse(expense, 'Expense recorded successfully'));
    },
  );

  // PATCH /api/v1/expenses/:id — Admin only
  app.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireRole(['ADMIN'])] },
    async (request, _reply) => {
      const data = validate(updateExpenseSchema, request.body);
      return successResponse(
        await updateExpense(app.prisma, request.params.id, data),
        'Expense updated successfully',
      );
    },
  );

  // DELETE /api/v1/expenses/:id — Admin only
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireRole(['ADMIN'])] },
    async (request, _reply) => {
      await deleteExpense(app.prisma, request.params.id);
      return successResponse(null, 'Expense deleted successfully');
    },
  );
}
