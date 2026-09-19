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

  const [study] = await db
    .insert(studies)
    .values({ title, year, endDate, description, status, titleEn, descriptionEn })
    .returning();

  return NextResponse.json({ ...study, participantCount: 0 }, { status: 201 });
}
