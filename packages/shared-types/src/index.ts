import { z } from 'zod';

// ─── Generic response shapes ──────────────────────────────────────────────────

export type ApiResponse<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; message?: string };

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

// ─── Pagination query ─────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Party schemas ────────────────────────────────────────────────────────────

export const createPartySchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional(),
    address: z.string().optional(),
    openingBalance: z.number().default(0),
    isSupplier: z.boolean().default(false),
    isCustomer: z.boolean().default(false),
  })
  .refine((d) => d.isSupplier || d.isCustomer, {
    message: 'Party must be a supplier, a customer, or both',
    path: ['isSupplier'],
  });

export const updatePartySchema = z
  .object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    isSupplier: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
  })
  .refine(
    (d) => {
      // Only validate the constraint if both flags are explicitly provided
      if (d.isSupplier !== undefined && d.isCustomer !== undefined) {
        return d.isSupplier || d.isCustomer;
      }
      return true;
    },
    {
      message: 'Party must be a supplier, a customer, or both',
      path: ['isSupplier'],
    },
  );

export type CreatePartyInput = z.infer<typeof createPartySchema>;
export type UpdatePartyInput = z.infer<typeof updatePartySchema>;

export type Party = {
  id: string;
  partyCode: string;
  name: string;
  phone: string | null;
  address: string | null;
  openingBalance: string; // Prisma Decimal serializes as string
  isSupplier: boolean;
  isCustomer: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
