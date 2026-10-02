import { NextResponse } from "next/server";
import { db } from "@/db";
import { studies } from "@/db/schema";
import { getDashboardData } from "@/lib/queries";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch studies" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = (body.title ?? "").toString().trim();
    const year = (body.year ?? "").toString().trim();
    const endDate = (body.endDate ?? "").toString().trim() || null;
    const description = (body.description ?? "").toString().trim() || null;
    const status = (body.status ?? "active").toString() || "active";
    const titleEn = (body.titleEn ?? "").toString().trim() || null;
    const descriptionEn = (body.descriptionEn ?? "").toString().trim() || null;

    if (!title || !year) {
      return NextResponse.json(
        { error: "Title and start date are required" },
        { status: 400 },
      );
    }
    if (endDate && endDate < year) {
      return NextResponse.json(
        { error: "The end date must be on or after the start date" },
        { status: 400 },
      );
    }

    const clientId = Number(body.id);
    let study;
    if (Number.isInteger(clientId) && clientId > 0) {
      const existing = await db.select().from(studies).where(eq(studies.id, clientId));
      if (existing.length > 0) {
        const [updated] = await db
          .update(studies)
          .set({ title, year, endDate, description, status, titleEn, descriptionEn })
          .where(eq(studies.id, clientId))
          .returning();
        study = updated;
      } else {
        const [created] = await db
          .insert(studies)
          .values({ id: clientId, title, year, endDate, description, status, titleEn, descriptionEn })
          .returning();
        study = created;
      }
      try {
        await db.execute(sql`SELECT setval('studies_id_seq', (SELECT GREATEST(MAX(id), 1) FROM studies))`);
      } catch {
        /* ignore */
      }
    } else {
      const [created] = await db
        .insert(studies)
        .values({ title, year, endDate, description, status, titleEn, descriptionEn })
        .returning();
      study = created;
    }

    return NextResponse.json({ ...study, participantCount: 0 }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create study" }, { status: 500 });
  }
}
