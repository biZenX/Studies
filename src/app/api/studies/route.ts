import { NextResponse } from "next/server";
import { db } from "@/db";
import { studies } from "@/db/schema";
import { getDashboardData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getDashboardData();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const title = (body.title ?? "").toString().trim();
  const year = (body.year ?? "").toString().trim();
  const description = (body.description ?? "").toString().trim() || null;
  const status = (body.status ?? "active").toString() || "active";

  if (!title || !year) {
    return NextResponse.json(
      { error: "Title and year are required" },
      { status: 400 },
    );
  }

  const [study] = await db
    .insert(studies)
    .values({ title, year, description, status })
    .returning();

  return NextResponse.json({ ...study, participantCount: 0 }, { status: 201 });
}
