import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../common/errors.js';
import { env } from '../../config/env.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthTokenPayload = {
  userId: string;
  role: string;
};

function generateAccessToken(userId: string, role: string): string {
  return jwt.sign({ userId, role } as AuthTokenPayload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function loginService(
  prisma: PrismaClient,
  email: string,
  password: string,
) {
  // Single error message for both "not found" and "wrong password" — never reveal which
  const invalidMsg = 'Invalid email or password';

  const user = await prisma.user.findFirst({
    where: { email, isActive: true, deletedAt: null },
  });

  if (!user) {
    // Still run bcrypt compare to prevent timing attacks that reveal user existence
    await bcrypt.compare(password, '$2b$12$invalidhashpadding000000000000000000000000000000000000000');
    throw new AppError(401, invalidMsg);
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    throw new AppError(401, invalidMsg);
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    },
  });

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  };
}

export async function refreshService(prisma: PrismaClient, refreshToken: string) {
  const sessionExpiredMsg = 'Session expired, please log in again';

  let payload: { userId: string };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    throw new AppError(401, sessionExpiredMsg);
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.userId, tokenHash },
  });

  if (!stored || stored.expiresAt < new Date()) {
    // If token exists but expired, clean it up
    if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new AppError(401, sessionExpiredMsg);
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.userId, isActive: true, deletedAt: null },
  });

  if (!user) {
    throw new AppError(401, sessionExpiredMsg);
  }

  // Token rotation — delete old, issue new
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const newAccessToken = generateAccessToken(user.id, user.role);
  const newRefreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    },
  });

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logoutService(prisma: PrismaClient, refreshToken: string | undefined) {
  if (!refreshToken) return; // idempotent — nothing to do

  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.deleteMany({
      where: { userId: payload.userId, tokenHash },
    });
  } catch {
    // Token invalid or already gone — that's fine, logout is idempotent
  }
}
