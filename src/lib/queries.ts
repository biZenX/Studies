import { db } from "@/db";
import { studies, participants } from "@/db/schema";
import { desc, eq, asc } from "drizzle-orm";
import type { Stats, StudyWithCount, Participant } from "./types";

export async function getDashboardData(): Promise<{
  studies: StudyWithCount[];
  stats: Stats;
}> {
  const list = await db.select().from(studies).orderBy(desc(studies.createdAt));

  const rows = await db
    .select({
      studyId: participants.studyId,
      country: participants.country,
      email: participants.email,
    })
    .from(participants);

  const countMap = new Map<number, number>();
  const countries = new Set<string>();
  let withEmail = 0;

  for (const r of rows) {
    countMap.set(r.studyId, (countMap.get(r.studyId) ?? 0) + 1);
    if (r.country) countries.add(r.country);
    if (r.email) withEmail += 1;
  }

  const studiesWithCount: StudyWithCount[] = list.map((s) => ({
    ...s,
    participantCount: countMap.get(s.id) ?? 0,
  }));

  return {
    studies: studiesWithCount,
    stats: {
      studies: list.length,
      participants: rows.length,
      countries: countries.size,
      withEmail,
    },
  };
}

export async function getStudyDetail(id: number): Promise<{
  study: StudyWithCount | null;
  participants: Participant[];
}> {
  const [study] = await db.select().from(studies).where(eq(studies.id, id));
  if (!study) return { study: null, participants: [] };

  const rows = await db
    .select()
    .from(participants)
    .where(eq(participants.studyId, id))
    .orderBy(asc(participants.id));

  return {
    study: { ...study, participantCount: rows.length },
    participants: rows,
  };
}
