import { notFound } from "next/navigation";
import { getStudyDetail } from "@/lib/queries";
import { isBrevoConfigured } from "@/lib/brevo";
import { StudyDetail } from "@/components/StudyDetail";
import type { StudyWithCount, Participant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const studyId = Number(id);
  if (!Number.isInteger(studyId)) notFound();

  let study: StudyWithCount | null = null;
  let participants: Participant[] = [];

  if (process.env.DATABASE_URL) {
    try {
      const res = await Promise.race([
        getStudyDetail(studyId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Database timeout")), 3000)
        ),
      ]);
      study = res.study;
      participants = res.participants;
    } catch (error) {
      console.warn("Database not reachable for study detail, using local-first storage:", error);
    }
  }

  return (
    <StudyDetail
      studyId={studyId}
      study={study}
      participants={participants}
      brevoConfigured={isBrevoConfigured()}
    />
  );
}
