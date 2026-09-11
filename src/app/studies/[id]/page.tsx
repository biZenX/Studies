import { notFound } from "next/navigation";
import { getStudyDetail } from "@/lib/queries";
import { isBrevoConfigured } from "@/lib/brevo";
import { StudyDetail } from "@/components/StudyDetail";

export const dynamic = "force-dynamic";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const studyId = Number(id);
  if (!Number.isInteger(studyId)) notFound();

  const { study, participants } = await getStudyDetail(studyId);
  if (!study) notFound();

  return (
    <StudyDetail
      study={study}
      participants={participants}
      brevoConfigured={isBrevoConfigured()}
    />
  );
}
