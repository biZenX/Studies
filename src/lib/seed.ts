import { db } from "@/db";
import { studies, participants } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { DEFAULT_STUDY, DEFAULT_PARTICIPANTS } from "./seed-data";

export async function ensureSeed() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS studies (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      year TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS participants (
      id SERIAL PRIMARY KEY,
      study_id INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      federation TEXT,
      country TEXT,
      email TEXT,
      phone TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  const existing = await db.select({ id: studies.id }).from(studies).limit(1);
  if (existing.length > 0) return;

  const [study] = await db
    .insert(studies)
    .values({
      title: DEFAULT_STUDY.title,
      year: DEFAULT_STUDY.year,
      description: DEFAULT_STUDY.description,
      status: DEFAULT_STUDY.status,
    })
    .returning({ id: studies.id });

  if (study) {
    await db.insert(participants).values(
      DEFAULT_PARTICIPANTS.map(([name, country]) => ({
        studyId: study.id,
        name,
        federation: country,
        country,
      })),
    );
  }
}

export async function resetSeed() {
  await db.execute(sql`TRUNCATE TABLE participants, studies RESTART IDENTITY CASCADE`);
  await ensureSeed();
}

export { eq };
