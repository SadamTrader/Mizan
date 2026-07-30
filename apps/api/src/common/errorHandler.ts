import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from './errors.js';
import { errorResponse } from './response.js';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
      // ── Zod validation errors ────────────────────────────────────────────────
      if (error instanceof ZodError) {
        const fields = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return reply.status(400).send(errorResponse('Validation failed', fields));
      }

      // ── AppError (intentional, thrown by service layer) ──────────────────────
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send(errorResponse(error.message));
      }

      // ── Prisma known errors ──────────────────────────────────────────────────
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation
          const fields = (error.meta?.target as string[]) ?? [];
          return reply
            .status(409)
            .send(errorResponse(`A record with this ${fields.join(', ')} already exists`));
        }
        if (error.code === 'P2025') {
          // Record not found (e.g. update/delete on non-existent record)
          return reply.status(404).send(errorResponse('Record not found'));
        }
        // Other known Prisma errors — log and return 400
        request.log.error({ prismaCode: error.code, meta: error.meta }, 'Prisma known error');
        return reply.status(400).send(errorResponse('Database operation failed'));
      }

      // ── Fastify built-in errors (e.g. 429 from rate-limit) ──────────────────
      if ('statusCode' in error && typeof (error as FastifyError).statusCode === 'number') {
        const statusCode = (error as FastifyError).statusCode ?? 500;
        // Rate limit and other Fastify errors already have a message — pass it through
        if (statusCode === 429) {
          return reply.status(429).send(errorResponse('Too many requests, slow down'));
        }
        if (statusCode < 500) {
          return reply.status(statusCode).send(errorResponse(error.message));
        }
      }

      // ── Unknown / unexpected errors ──────────────────────────────────────────
      request.log.error({ err: error }, 'Unhandled error');
      return reply.status(500).send(errorResponse('Something went wrong'));
    },
  );
}
