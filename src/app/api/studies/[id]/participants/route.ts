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

  const body = await req.json();
  const name = (body.name ?? "").toString().trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(participants)
    .values({
      studyId,
      name,
      federation: body.federation?.toString().trim() || null,
      country: body.country?.toString().trim() || null,
      email: body.email?.toString().trim() || null,
      phone: body.phone?.toString().trim() || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
