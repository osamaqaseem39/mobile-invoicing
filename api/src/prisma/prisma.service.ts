import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Hostinger shared hosting has low process/thread limits. Prisma's default
 * Rust query engine panics there with "timer has gone away" and Passenger
 * then returns 503. Use the JS/Wasm client engine + pg adapter instead, with
 * a single pooled connection (also correct for Supabase PgBouncer).
 */
function databaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  return raw;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: databaseUrl(),
      max: 1,
      idleTimeoutMillis: 10_000,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
