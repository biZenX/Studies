import { NextResponse } from "next/server";
import { db } from "@/db";
import { studies, participants } from "@/db/schema";
import { eq, count } from "drizzle-orm";

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

  const [study] = await db.select().from(studies).where(eq(studies.id, studyId));
  if (!study) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [row] = await db
    .select({ n: count() })
    .from(participants)
    .where(eq(participants.studyId, studyId));

  return NextResponse.json({ ...study, participantCount: row?.n ?? 0 });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const studyId = Number(id);
  if (!Number.isInteger(studyId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const values: Record<string, string | null> = {};

  if (body.title !== undefined) values.title = String(body.title).trim();
  if (body.year !== undefined) values.year = String(body.year).trim();
  if (body.description !== undefined)
    values.description = String(body.description).trim() || null;
  if (body.status !== undefined) values.status = String(body.status);

  if (values.title === "") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(studies)
    .set(values)
    .where(eq(studies.id, studyId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const studyId = Number(id);
  if (!Number.isInteger(studyId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await db.delete(studies).where(eq(studies.id, studyId));
  return NextResponse.json({ ok: true });
}
