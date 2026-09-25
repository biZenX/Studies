import { NextResponse } from "next/server";
import { db } from "@/db";
import { studies, participants } from "@/db/schema";
import { desc, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Full snapshot for multi-device sync.
 * Client pulls this on boot when the database is available, then mirrors it
 * into localStorage so the same data is reachable from any browser.
 */
export async function GET() {
  try {
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
