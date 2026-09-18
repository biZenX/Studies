import { notFound } from "next/navigation";
import { getStudyDetail } from "@/lib/queries";
import { StudyEditForm } from "@/components/StudyEditForm";
import type { StudyWithCount } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * `/studies/:id/edit` — the dedicated study editing page.
 *
 * The app also exposes the same fields inside a modal, but the URL has to keep
 * working: deep links, browser back/forward and automated flows all rely on it.
 */
export default async function EditStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const studyId = Number(id);
  if (!Number.isInteger(studyId) || studyId <= 0) notFound();

  let study: StudyWithCount | null = null;

  if (process.env.DATABASE_URL) {
    try {
      const res = await Promise.race([
        getStudyDetail(studyId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Database timeout")), 3000),
        ),
      ]);
      study = res.study;
    } catch (error) {
      console.warn("Database not reachable on the edit page, using local-first storage:", error);
    }
  }

  return <StudyEditForm studyId={studyId} initialStudy={study} />;
}
