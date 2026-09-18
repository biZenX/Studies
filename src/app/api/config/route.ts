import { isBrevoConfigured, senderInfo } from "@/lib/brevo";

export const dynamic = "force-dynamic";

/**
 * Tells the UI which optional services are actually configured, without ever
 * exposing a secret value. Used by the e-mail dialog to explain exactly what is
 * missing instead of failing silently.
 */
export async function GET() {
  let database = false;
  let databaseError: string | null = null;

  if (process.env.DATABASE_URL) {
    try {
      const { db } = await import("@/db");
      const { sql } = await import("drizzle-orm");
      await Promise.race([
        db.execute(sql`select 1`),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 3000),
        ),
      ]);
      database = true;
    } catch (err) {
      databaseError = err instanceof Error ? err.message : String(err);
    }
  }

  const sender = senderInfo();

  return Response.json({
    brevo: isBrevoConfigured(),
    database,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    databaseError,
    senderName: sender.name,
    senderEmail: sender.email,
    mode: database ? "database" : "local-first",
  });
}
