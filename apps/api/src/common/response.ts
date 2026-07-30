export function successResponse<T>(data: T, message?: string) {
  return {
    success: true as const,
    ...(message ? { message } : {}),
    data,
  };
}

export function errorResponse(message: string, errors?: unknown) {
  return {
    success: false as const,
    message,
    ...(errors !== undefined ? { errors } : {}),
  };
}
