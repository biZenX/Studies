import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const studyId = Number(id);
    if (!Number.isInteger(studyId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(participants)
      .where(eq(participants.studyId, studyId))
      .orderBy(asc(participants.id));

    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch participants" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const studyId = Number(id);
    if (!Number.isInteger(studyId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    // Support batch insert when body is an array of participants
    if (Array.isArray(body)) {
      const results = [];
      for (const item of body) {
        const name = (item.name ?? "").toString().trim();
        if (!name) continue;
        const values = {
          studyId,
          name,
          federation: item.federation?.toString().trim() || null,
          country: item.country?.toString().trim() || null,
          email: item.email?.toString().trim() || null,
          phone: item.phone?.toString().trim() || null,
          code: item.code?.toString().trim() || null,
        };
        const clientId = Number(item.id);
        if (Number.isInteger(clientId) && clientId > 0) {
          const [updated] = await db
            .update(participants)
            .set(values)
            .where(eq(participants.id, clientId))
            .returning();
          if (updated) {
            results.push(updated);
            continue;
          }
          const [created] = await db
            .insert(participants)
            .values({ id: clientId, ...values })
            .returning();
          results.push(created);
        } else {
          const [created] = await db.insert(participants).values(values).returning();
          results.push(created);
        }
      }
      try {
        await db.execute(sql`SELECT setval('participants_id_seq', (SELECT GREATEST(MAX(id), 1) FROM participants))`);
      } catch {
        /* ignore */
      }
      return NextResponse.json(results, { status: 201 });
    }

    const name = (body.name ?? "").toString().trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const values = {
      studyId,
      name,
      federation: body.federation?.toString().trim() || null,
      country: body.country?.toString().trim() || null,
      email: body.email?.toString().trim() || null,
      phone: body.phone?.toString().trim() || null,
      code: body.code?.toString().trim() || null,
    };

    const clientId = Number(body.id);
    let result;
    if (Number.isInteger(clientId) && clientId > 0) {
      const [updated] = await db
        .update(participants)
        .set(values)
        .where(eq(participants.id, clientId))
        .returning();
      if (updated) {
        result = updated;
      } else {
        const [created] = await db
          .insert(participants)
          .values({ id: clientId, ...values })
          .returning();
        result = created;
      }
      try {
        await db.execute(sql`SELECT setval('participants_id_seq', (SELECT GREATEST(MAX(id), 1) FROM participants))`);
      } catch {
        /* ignore */
      }
    } else {
      const [created] = await db.insert(participants).values(values).returning();
      result = created;
      try {
        await db.execute(sql`SELECT setval('participants_id_seq', (SELECT GREATEST(MAX(id), 1) FROM participants))`);
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create participant" }, { status: 500 });
  }
}
