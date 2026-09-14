import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let poolInstance: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Please add the DATABASE_URL secret or environment variable in Cloudflare Workers settings."
    );
  }

  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");

  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 4000,
  });

  pool.on("error", (err) => {
    console.error("Postgres pool error:", err);
  });

  return pool;
}

export function getPool(): Pool {
  const globalForDb = globalThis as typeof globalThis & {
    pgPool?: Pool;
  };

  if (!globalForDb.pgPool) {
    globalForDb.pgPool = createPool();
  }
  return globalForDb.pgPool;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool());
  }
  return dbInstance;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const instance = getPool();
    const val = (instance as any)[prop];
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const instance = getDb();
    const val = (instance as any)[prop];
    return typeof val === "function" ? val.bind(instance) : val;
  },
});
