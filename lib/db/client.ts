import path from "node:path";
import fs from "node:fs";

// .env file is authoritative over inherited shell vars in dev
try {
  const envText = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
  const m = envText.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m);
  if (m) process.env.DATABASE_URL = m[1];
} catch {}
import { PrismaClient } from "@/prisma/generated/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// dev hot-reload safe singleton
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Resolve the sqlite file relative to the project root, not the process cwd. */
export function resolveSqliteUrl(url: string): string {
  if (!url.startsWith("file:")) return url;
  const p = url.slice("file:".length);
  if (path.isAbsolute(p)) return url;
  return "file:" + path.resolve(process.cwd(), p);
}

function createClient() {
  const adapter = new PrismaBetterSqlite3({
    url: resolveSqliteUrl(process.env.DATABASE_URL ?? "file:./prisma/dev.db"),
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
