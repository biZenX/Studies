import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const participantId = Number(id);
  if (!Number.isInteger(participantId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const values: Record<string, string | null> = {};

  if (body.name !== undefined) values.name = String(body.name).trim();
  if (body.federation !== undefined)
    values.federation = String(body.federation).trim() || null;
  if (body.country !== undefined)
    values.country = String(body.country).trim() || null;
  if (body.email !== undefined)
    values.email = String(body.email).trim() || null;
  if (body.phone !== undefined) values.phone = String(body.phone).trim() || null;
  if (body.code !== undefined) values.code = String(body.code).trim() || null;

  if (values.name === "") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(participants)
    .set(values)
    .where(eq(participants.id, participantId))
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
  const participantId = Number(id);
  if (!Number.isInteger(participantId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await db.delete(participants).where(eq(participants.id, participantId));
  return NextResponse.json({ ok: true });
}
