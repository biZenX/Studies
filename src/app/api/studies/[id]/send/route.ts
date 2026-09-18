import { NextResponse } from "next/server";
import { studies, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildEmailHtml, sendBrevoEmail, isBrevoConfigured } from "@/lib/brevo";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Recipient = { name: string; email: string };

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const studyId = Number(id);
  if (!Number.isInteger(studyId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  if (!isBrevoConfigured()) {
    return NextResponse.json(
      {
        error:
          "BREVO_API_KEY is not configured. Add BREVO_API_KEY (plus BREVO_SENDER_NAME and BREVO_SENDER_EMAIL) to the deployment environment to enable sending.",
      },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const subject = (body.subject ?? "").toString().trim();
  const message = (body.message ?? "").toString().trim();

  if (!subject || !message) {
    return NextResponse.json(
      { error: "Subject and message are required" },
      { status: 400 },
    );
  }

  // The app is local-first: the browser owns the roster. When it sends the
  // recipients along we use them directly and never touch the database.
  let recipients: Recipient[] = Array.isArray(body.recipients)
    ? body.recipients
        .filter((r: any) => r && typeof r.email === "string" && EMAIL_RE.test(r.email))
        .map((r: any) => ({
          name: String(r.name ?? "").trim() || String(r.email).split("@")[0],
          email: String(r.email).trim(),
        }))
    : [];

  let studyTitle = subject;
  let studyDate = "";

  if (recipients.length === 0) {
    try {
      const { db } = await import("@/db");
      const [study] = await db.select().from(studies).where(eq(studies.id, studyId));
      if (!study) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      studyTitle = study.title;
      studyDate = study.year;

      const rows = await db
        .select()
        .from(participants)
        .where(eq(participants.studyId, studyId));

      recipients = rows
        .filter((p) => p.email && EMAIL_RE.test(p.email))
        .map((p) => ({ name: p.name, email: p.email as string }));
    } catch (err) {
      return NextResponse.json(
        {
          error:
            "No recipients were provided and the database is not reachable. The roster lives in this browser (local-first), so retry from the study page.",
          detail: err instanceof Error ? err.message : String(err),
        },
        { status: 400 },
      );
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No valid email addresses found for this study" },
      { status: 400 },
    );
  }

  // De-duplicate addresses so nobody receives the same mail twice.
  const seen = new Set<string>();
  recipients = recipients.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const htmlContent = buildEmailHtml({
    studyTitle: body.studyTitle ? String(body.studyTitle) : studyTitle,
    year: body.studyDate ? String(body.studyDate) : studyDate,
    message,
  });

  const CHUNK = 50;
  let sent = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += CHUNK) {
    const slice = recipients.slice(i, i + CHUNK);
    try {
      await sendBrevoEmail({
        to: slice.map((p) => ({ email: p.email, name: p.name })),
        subject,
        htmlContent,
      });
      sent += slice.length;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return NextResponse.json({
    total: recipients.length,
    sent,
    failed: recipients.length - sent,
    errors: errors.slice(0, 5),
  });
}
