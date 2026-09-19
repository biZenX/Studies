import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const studies = pgTable("studies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  /**
   * Free-form date field. Historically this held a 4-digit year, it now holds a
   * full ISO date (YYYY-MM-DD) whenever the user picks one. Both are accepted so
   * old records keep working.
   */
  year: text("year").notNull(),
  /**
   * Optional end of the study period (ISO date, YYYY-MM-DD). Together with
   * `year` (the start) it forms the "from – to" range: the study is *upcoming*
   * before the start, *active* in between and *completed* once the end has
   * passed. NULL means open-ended (active until closed manually).
   */
  endDate: text("end_date"),
  description: text("description"),
  /**
   * Stored status: "active" (follow the schedule automatically), "draft" or
   * "closed" (manual override). The status shown in the UI is derived from this
   * value plus the date range — see `resolveStudyStatus`.
   */
  status: text("status").notNull().default("active"),
  /** Optional English title used when the UI language is switched to English. */
  titleEn: text("title_en"),
  /** Optional English description used when the UI language is English. */
  descriptionEn: text("description_en"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  studyId: integer("study_id")
    .notNull()
    .references(() => studies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  federation: text("federation"),
  country: text("country"),
  email: text("email"),
  phone: text("phone"),
  /**
   * Optional "file / registration number" that some source sheets carry. It is
   * only filled when the smart importer decides a numeric column is a real
   * identifier and not a plain 1,2,3 row counter.
   */
  code: text("code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Study = typeof studies.$inferSelect;
export type NewStudy = typeof studies.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
