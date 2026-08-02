import { PrismaClient } from '@prisma/client';
import { AppError } from '../../common/errors.js';
import type { CreateVehicleInput, UpdateVehicleInput } from '@scrap-erp/shared-types';

export type ListVehiclesFilters = {
  search?: string;
  page?: number;
  limit?: number;
};

export async function listVehicles(prisma: PrismaClient, filters: ListVehiclesFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(filters.search && {
      OR: [
        { vehicleNo: { contains: filters.search, mode: 'insensitive' as const } },
        { ownerName: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.vehicle.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.vehicle.count({ where }),
  ]);

  return { items, total, page, pageSize: limit };
}

export async function getVehicleById(prisma: PrismaClient, id: string) {
  const v = await prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  if (!v) throw new AppError(404, 'Vehicle not found');
  return v;
}

export async function createVehicle(prisma: PrismaClient, data: CreateVehicleInput) {
  return prisma.vehicle.create({
    data: {
      vehicleNo: data.vehicleNo,
      ownerName: data.ownerName ?? null,
      notes: data.notes ?? null,
    },
  });
}

export async function updateVehicle(prisma: PrismaClient, id: string, data: UpdateVehicleInput) {
  await getVehicleById(prisma, id);
  return prisma.vehicle.update({
    where: { id },
    data: {
      ...(data.vehicleNo !== undefined && { vehicleNo: data.vehicleNo }),
      ...(data.ownerName !== undefined && { ownerName: data.ownerName }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function deactivateVehicle(prisma: PrismaClient, id: string) {
  await getVehicleById(prisma, id);
  return prisma.vehicle.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
