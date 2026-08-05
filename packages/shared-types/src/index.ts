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
  openingBalance: string;
  isSupplier: boolean;
  isCustomer: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  currentBalance?: string; // live calculated — present on getPartyById, not on list
};

// ─── ScrapItem schemas ────────────────────────────────────────────────────────

export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
  unit: z.enum(['KG', 'TON']),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  unit: z.enum(['KG', 'TON']).optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export type ScrapItem = {
  id: string;
  itemCode: string;
  name: string;
  category: string | null;
  unit: 'KG' | 'TON';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// ─── Warehouse schemas ────────────────────────────────────────────────────────

export const createWarehouseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
});

export const updateWarehouseSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

export type Warehouse = {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// ─── Vehicle schemas ──────────────────────────────────────────────────────────

export const createVehicleSchema = z.object({
  vehicleNo: z.string().min(1, 'Vehicle number is required'),
  ownerName: z.string().optional(),
  notes: z.string().optional(),
});

export const updateVehicleSchema = z.object({
  vehicleNo: z.string().min(1).optional(),
  ownerName: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export type Vehicle = {
  id: string;
  vehicleNo: string;
  ownerName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// ─── Purchase schemas ─────────────────────────────────────────────────────────

export const createPurchaseItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  grossWeight: z.number().positive('Gross weight must be positive'),
  cutWeight: z.number().min(0, 'Cut weight cannot be negative').default(0),
  rate: z.number().positive('Rate must be positive'),
});

export const createPurchaseSchema = z
  .object({
    partyId: z.string().uuid('Invalid party ID'),
    vehicleId: z.string().uuid('Invalid vehicle ID').optional(),
    warehouseId: z.string().uuid('Invalid warehouse ID'),
    purchaseDate: z.string().min(1, 'Purchase date is required'),
    expenseAmount: z.number().min(0).default(0),
    items: z.array(createPurchaseItemSchema).min(1, 'At least one item is required'),
  })
  .refine(
    (d) => d.items.every((item) => item.cutWeight < item.grossWeight),
    {
      message: 'Cut weight must be less than gross weight for all items',
      path: ['items'],
    },
  );

export type CreatePurchaseItemInput = z.infer<typeof createPurchaseItemSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export type PurchaseItem = {
  id: string;
  purchaseId: string;
  itemId: string;
  grossWeight: string;
  cutWeight: string;
  netWeight: string;
  rate: string;
  amount: string;
  item?: ScrapItem;
};

export type Purchase = {
  id: string;
  purchaseNumber: string;
  partyId: string;
  vehicleId: string | null;
  warehouseId: string;
  purchaseDate: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  grossAmount: string;
  expenseAmount: string;
  netAmount: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  party?: Party;
  vehicle?: Vehicle;
  warehouse?: Warehouse;
  items?: PurchaseItem[];
};

// ─── Sale schemas ─────────────────────────────────────────────────────────────

export const createSaleItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  quantity: z.number().positive('Quantity must be positive'),
  rate: z.number().positive('Rate must be positive'),
});

export const createSaleSchema = z.object({
  partyId: z.string().uuid('Invalid party ID'),
  warehouseId: z.string().uuid('Invalid warehouse ID'),
  saleDate: z.string().min(1, 'Sale date is required'),
  expenseAmount: z.number().min(0).default(0),
  items: z.array(createSaleItemSchema).min(1, 'At least one item is required'),
});

export type CreateSaleItemInput = z.infer<typeof createSaleItemSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export type SaleItem = {
  id: string;
  saleId: string;
  itemId: string;
  quantity: string;
  rate: string;
  amount: string;
  unitCost: string | null; // weighted avg cost at time of sale; null for pre-9c records
  item?: ScrapItem;
};

export type Sale = {
  id: string;
  saleNumber: string;
  partyId: string;
  warehouseId: string;
  saleDate: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  grossAmount: string;
  expenseAmount: string;
  netAmount: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  party?: Party;
  warehouse?: Warehouse;
  items?: SaleItem[];
};

// ─── Profit Report types ──────────────────────────────────────────────────────

export type ProfitReportRow = {
  id: string;
  saleNumber: string;
  saleDate: string;
  partyName: string | null;
  warehouseName: string | null;
  grossAmount: string;
  expenseAmount: string;
  cogs: string;
  netProfit: string;
  marginPct: string;
};

export type ProfitReportSummary = {
  totalSales: number;
  totalRevenue: string;
  totalExpense: string;
  totalCogs: string;
  totalProfit: string;
  profitMarginPct: string;
};

export type ProfitReport = {
  rows: ProfitReportRow[];
  summary: ProfitReportSummary;
};

// ─── Payment schemas ──────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  partyId: z.string().uuid('Invalid party ID'),
  paymentType: z.enum(['SUPPLIER_PAYMENT', 'CUSTOMER_PAYMENT']),
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']),
  referenceNumber: z.string().optional(),
  paymentDate: z.string().min(1, 'Payment date is required'),
  remarks: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export type Payment = {
  id: string;
  paymentNumber: string;
  partyId: string;
  paymentType: 'SUPPLIER_PAYMENT' | 'CUSTOMER_PAYMENT';
  amount: string;
  method: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
  referenceNumber: string | null;
  paymentDate: string;
  remarks: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  party?: Party;
};

export type LedgerEntry = {
  id: string;
  partyId: string;
  transactionType: 'PURCHASE' | 'SALE' | 'PAYMENT' | 'EXPENSE_ADJUSTMENT';
  referenceType: string;
  referenceId: string;
  debit: string;
  credit: string;
  balanceAfter: string;
  entryDate: string;
  createdAt: string;
};

export type PartyLedger = {
  openingBalance: string;
  entries: LedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
};

// ─── Expense schemas ──────────────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  category: z.enum(['RENT', 'SALARY', 'FUEL', 'UTILITIES', 'MAINTENANCE', 'OTHER']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  expenseDate: z.string().min(1, 'Expense date is required'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export type Expense = {
  id: string;
  expenseNumber: string;
  category: 'RENT' | 'SALARY' | 'FUEL' | 'UTILITIES' | 'MAINTENANCE' | 'OTHER';
  amount: string;
  description: string;
  expenseDate: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
