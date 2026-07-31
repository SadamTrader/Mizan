import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors.js';
import { AuthTokenPayload } from '../../modules/auth/auth.service.js';

// Extend Fastify's request type to carry the authenticated user
declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: string;
      role: string;
    };
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Unauthorized');
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    request.user = { userId: payload.userId, role: payload.role };
  } catch {
    throw new AppError(401, 'Unauthorized');
  }
}

export function requireRole(roles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new AppError(401, 'Unauthorized');
    }
    if (!roles.includes(request.user.role)) {
      throw new AppError(403, 'Forbidden');
    }
  };
}
