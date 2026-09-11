import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, status: "Database connected successfully" });
  } catch (err: any) {
    const rawUrl = process.env.DATABASE_URL || "";
    let maskedUrl = "NOT_CONFIGURED";
    if (rawUrl) {
      try {
        const u = new URL(rawUrl);
        maskedUrl = `${u.protocol}//${u.username ? "***:***@" : ""}${u.host}${u.pathname}`;
      } catch {
        maskedUrl = "INVALID_URL_FORMAT";
      }
    }

    return Response.json(
      {
        ok: false,
        error: err?.message || String(err),
        code: err?.code || err?.cause?.code,
        database_url_target: maskedUrl,
      },
      { status: 500 }
    );
  }
}
