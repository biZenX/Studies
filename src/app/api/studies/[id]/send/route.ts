import { NextResponse } from "next/server";
import { db } from "@/db";
import { studies, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildEmailHtml, sendBrevoEmail, isBrevoConfigured } from "@/lib/brevo";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  req: Request,
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

  if (!isBrevoConfigured()) {
    return NextResponse.json(
      { error: "BREVO_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const body = await req.json();
  const subject = (body.subject ?? "").toString().trim();
  const message = (body.message ?? "").toString().trim();

  if (!subject || !message) {
    return NextResponse.json(
      { error: "Subject and message are required" },
      { status: 400 },
    );
  }

  const rows = await db
    .select()
    .from(participants)
    .where(eq(participants.studyId, studyId));

  const valid = rows.filter((p) => p.email && EMAIL_RE.test(p.email));
  if (valid.length === 0) {
    return NextResponse.json(
      { error: "No valid email addresses found for this study" },
      { status: 400 },
    );
  }

  const htmlContent = buildEmailHtml({
    studyTitle: study.title,
    year: study.year,
    message,
  });

  const CHUNK = 100;
  let sent = 0;
  const errors: string[] = [];

  for (let i = 0; i < valid.length; i += CHUNK) {
    const slice = valid.slice(i, i + CHUNK);
    try {
      await sendBrevoEmail({
        to: slice.map((p) => ({ email: p.email as string, name: p.name })),
        subject,
        htmlContent,
      });
      sent += slice.length;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return NextResponse.json({
    total: valid.length,
    sent,
    failed: valid.length - sent,
    errors,
  });
}
