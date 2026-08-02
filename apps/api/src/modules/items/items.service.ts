import { PrismaClient } from '@prisma/client';
import { AppError } from '../../common/errors.js';
import type { CreateItemInput, UpdateItemInput } from '@scrap-erp/shared-types';

async function generateItemCode(prisma: PrismaClient): Promise<string> {
  const last = await prisma.scrapItem.findFirst({
    where: { itemCode: { startsWith: 'ITM-' } },
    orderBy: { itemCode: 'desc' },
    select: { itemCode: true },
  });

  let next = 1;
  if (last) {
    const num = parseInt(last.itemCode.replace('ITM-', ''), 10);
    if (!isNaN(num)) next = num + 1;
  }

  return `ITM-${String(next).padStart(4, '0')}`;
}

export type ListItemsFilters = {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

export async function listItems(prisma: PrismaClient, filters: ListItemsFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(filters.isActive !== undefined ? { isActive: filters.isActive } : { isActive: true }),
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' as const } },
        { itemCode: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.scrapItem.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.scrapItem.count({ where }),
  ]);

  return { items, total, page, pageSize: limit };
}

export async function getItemById(prisma: PrismaClient, id: string) {
  const item = await prisma.scrapItem.findFirst({ where: { id, deletedAt: null } });
  if (!item) throw new AppError(404, 'Item not found');
  return item;
}

export async function createItem(prisma: PrismaClient, data: CreateItemInput) {
  const itemCode = await generateItemCode(prisma);
  return prisma.scrapItem.create({
    data: {
      itemCode,
      name: data.name,
      category: data.category ?? null,
      unit: data.unit,
    },
  });
}

export async function updateItem(prisma: PrismaClient, id: string, data: UpdateItemInput) {
  await getItemById(prisma, id);
  return prisma.scrapItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.unit !== undefined && { unit: data.unit }),
    },
  });
}

export async function deactivateItem(prisma: PrismaClient, id: string) {
  await getItemById(prisma, id);
  return prisma.scrapItem.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });
}
