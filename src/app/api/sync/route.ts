import { NextResponse } from "next/server";
import { db } from "@/db";
import { studies, participants } from "@/db/schema";
import { desc, asc, eq, sql } from "drizzle-orm";
import { ensureSeed, ensureSchema } from "@/lib/seed";

export const dynamic = "force-dynamic";

/**
 * Full snapshot for multi-device sync.
 * Client pulls this on boot when the database is available, then mirrors it
 * into localStorage so the same data is reachable from any browser.
 */
export async function GET() {
  try {
    await ensureSeed();
    const studyRows = await db.select().from(studies).orderBy(desc(studies.createdAt));
    const participantRows = await db
      .select()
      .from(participants)
      .orderBy(asc(participants.id));

    return NextResponse.json({
      ok: true,
      studies: studyRows,
      participants: participantRows,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

/**
 * Bi-directional sync: pushes client-side additions/updates and returns
 * the canonical snapshot from the database.
 */
export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const clientStudies = Array.isArray(body.studies) ? body.studies : [];
    const clientParticipants = Array.isArray(body.participants) ? body.participants : [];

    // 1. Sync studies
    for (const s of clientStudies) {
      const studyId = Number(s.id);
      if (!studyId || !s.title) continue;

      const studyValues = {
        title: String(s.title).trim(),
        year: String(s.year || "").trim(),
        endDate: s.endDate ? String(s.endDate).trim() : null,
        description: s.description ? String(s.description).trim() : null,
        status: String(s.status || "active"),
        titleEn: s.titleEn ? String(s.titleEn).trim() : null,
        descriptionEn: s.descriptionEn ? String(s.descriptionEn).trim() : null,
      };

      const existing = await db.select().from(studies).where(eq(studies.id, studyId));
      if (existing.length > 0) {
        await db.update(studies).set(studyValues).where(eq(studies.id, studyId));
      } else {
        await db.insert(studies).values({ id: studyId, ...studyValues });
      }
    }

    if (clientStudies.length > 0) {
      try {
        await db.execute(
          sql`SELECT setval('studies_id_seq', (SELECT GREATEST(MAX(id), 1) FROM studies))`
        );
      } catch {
        /* ignore */
      }
    }

    // 2. Sync participants
    for (const p of clientParticipants) {
      const pId = Number(p.id);
      const studyId = Number(p.studyId);
      const name = String(p.name || "").trim();
      if (!pId || !studyId || !name) continue;

      const pValues = {
        studyId,
        name,
        federation: p.federation ? String(p.federation).trim() : null,
        country: p.country ? String(p.country).trim() : null,
        email: p.email ? String(p.email).trim() : null,
        phone: p.phone ? String(p.phone).trim() : null,
        code: p.code ? String(p.code).trim() : null,
      };

      const studyExists = await db.select({ id: studies.id }).from(studies).where(eq(studies.id, studyId));
      if (studyExists.length === 0) continue;

      const existing = await db.select().from(participants).where(eq(participants.id, pId));
      if (existing.length > 0) {
        await db.update(participants).set(pValues).where(eq(participants.id, pId));
      } else {
        await db.insert(participants).values({ id: pId, ...pValues });
      }
    }

    if (clientParticipants.length > 0) {
      try {
        await db.execute(
          sql`SELECT setval('participants_id_seq', (SELECT GREATEST(MAX(id), 1) FROM participants))`
        );
      } catch {
        /* ignore */
      }
    }

    // Return the authoritative snapshot
    const studyRows = await db.select().from(studies).orderBy(desc(studies.createdAt));
    const participantRows = await db
      .select()
      .from(participants)
      .orderBy(asc(participants.id));

    return NextResponse.json({
      ok: true,
      studies: studyRows,
      participants: participantRows,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
