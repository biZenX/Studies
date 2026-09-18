import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const studyId = Number(id);
  if (!Number.isInteger(studyId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
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

  // The browser owns the ids in local-first mode. When it sends one back we
  // update that row instead of inserting a duplicate.
  const clientId = Number(body.id);
  if (Number.isInteger(clientId) && clientId > 0) {
    const [updated] = await db
      .update(participants)
      .set(values)
      .where(eq(participants.id, clientId))
      .returning();
    if (updated) return NextResponse.json(updated);
  }

  const [created] = await db.insert(participants).values(values).returning();
  return NextResponse.json(created, { status: 201 });
}
