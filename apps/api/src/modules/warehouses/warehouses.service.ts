import { PrismaClient } from '@prisma/client';
import { AppError } from '../../common/errors.js';
import type { CreateWarehouseInput, UpdateWarehouseInput } from '@scrap-erp/shared-types';

export type ListWarehousesFilters = {
  isActive?: boolean;
};

export async function listWarehouses(prisma: PrismaClient, filters: ListWarehousesFilters) {
  const where = {
    deletedAt: null,
    ...(filters.isActive !== undefined ? { isActive: filters.isActive } : { isActive: true }),
  };
  return prisma.warehouse.findMany({ where, orderBy: { name: 'asc' } });
}

export async function getWarehouseById(prisma: PrismaClient, id: string) {
  const wh = await prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
  if (!wh) throw new AppError(404, 'Warehouse not found');
  return wh;
}

export async function createWarehouse(prisma: PrismaClient, data: CreateWarehouseInput) {
  return prisma.warehouse.create({
    data: { name: data.name, address: data.address ?? null },
  });
}

export async function updateWarehouse(
  prisma: PrismaClient,
  id: string,
  data: UpdateWarehouseInput,
) {
  await getWarehouseById(prisma, id);
  return prisma.warehouse.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.address !== undefined && { address: data.address }),
    },
  });
}

export async function deactivateWarehouse(prisma: PrismaClient, id: string) {
  await getWarehouseById(prisma, id);

  // Guard: never deactivate the last active warehouse
  const activeCount = await prisma.warehouse.count({
    where: { isActive: true, deletedAt: null },
  });
  if (activeCount <= 1) {
    throw new AppError(422, 'Cannot deactivate the only active warehouse');
  }

  return prisma.warehouse.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });
}
