import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

// .env file is authoritative over inherited shell vars (avoids stale-export drift)
function envFileValue(key: string): string | undefined {
  try {
    const text = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    const m = text.match(new RegExp("^" + key + "=[\"']?([^\"'\\n]+)[\"']?", "m"));
    return m?.[1];
  } catch {
    return undefined;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node --experimental-strip-types prisma/seed.ts",
  },
  datasource: {
    url: envFileValue("DATABASE_URL") ?? process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
