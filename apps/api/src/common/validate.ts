import { ZodSchema, ZodError } from 'zod';

/**
 * Validates data against a Zod schema.
 * Throws ZodError on failure — caught and formatted by the global error handler.
 *
 * Usage:
 *   const body = validate(createPartySchema, request.body);
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ZodError(result.error.issues);
  }
  return result.data;
}
