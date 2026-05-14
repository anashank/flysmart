import { PrismaClient } from '@/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

function createPrisma() {
  const rawUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
  const url = rawUrl.startsWith('file:') ? rawUrl : `file:${rawUrl}`;
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter } as never);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
