import { FastifyInstance } from 'fastify';
import { validate } from '../../common/validate.js';
import { successResponse } from '../../common/response.js';
import { loginSchema } from './auth.schema.js';
import { loginService, refreshService, logoutService } from './auth.service.js';

const COOKIE_NAME = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
};

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/login
  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const { email, password } = validate(loginSchema, request.body);
      const result = await loginService(app.prisma, email, password);

      reply.setCookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

      return reply.send(
        successResponse(
          { user: result.user, accessToken: result.accessToken },
          'Login successful',
        ),
      );
    },
  );

  // POST /api/v1/auth/refresh
  app.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies[COOKIE_NAME];
    const result = await refreshService(app.prisma, refreshToken ?? '');

    reply.setCookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

    return reply.send(
      successResponse(
        { user: result.user, accessToken: result.accessToken },
        'Token refreshed',
      ),
    );
  });

  // POST /api/v1/auth/logout
  app.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies[COOKIE_NAME];
    await logoutService(app.prisma, refreshToken);

    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return reply.send(successResponse(null, 'Logged out successfully'));
  });
}
