import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeArabicText,
  computeStudyStats,
  aggregateAttributeCounts,
  filterParticipants,
  sortParticipants,
  filterAndSortStudies,
  computeGlobalStats,
} from "./rosterEngine";
import type { Participant, StudyWithCount } from "@/lib/types";

describe("Domain Layer: rosterEngine pure logic", () => {
  describe("normalizeArabicText", () => {
    it("normalizes Arabic Alef forms, Taa Marbuta, and removes Tashkeel", () => {
      // إسلام / أحمد / آمنة / الرحمن
      assert.equal(normalizeArabicText("إِسْلَام"), "اسلام");
      assert.equal(normalizeArabicText("أَحْمَد"), "احمد");
      assert.equal(normalizeArabicText("آمِنَة"), "امنه");
      assert.equal(normalizeArabicText("مستشفى"), "مستشفي");
    });

    it("handles null, undefined and empty strings safely", () => {
      assert.equal(normalizeArabicText(null), "");
      assert.equal(normalizeArabicText(undefined), "");
      assert.equal(normalizeArabicText(""), "");
    });
  });

  describe("computeStudyStats", () => {
    it("computes accurate stats for participants with varying field completions", () => {
      const participants: Participant[] = [
        {
          id: 1,
          studyId: 1,
          name: "أحمد",
          country: "مصر",
          federation: "الاتحاد المصري",
          email: "ahmed@example.com",
          phone: "0100000000",
          code: "101",
          createdAt: new Date(),
        },
        {
          id: 2,
          studyId: 1,
          name: "خالد",
          country: "السعودية",
          federation: "الاتحاد السعودي",
          email: null,
          phone: "0500000000",
          code: null,
          createdAt: new Date(),
        },
        {
          id: 3,
          studyId: 1,
          name: "سامي",
          country: "مصر",
          federation: null,
          email: "sami@test.com",
          phone: null,
          code: null,
          createdAt: new Date(),
        },
      ];

      const stats = computeStudyStats(participants);
      assert.equal(stats.participants, 3);
      assert.equal(stats.countries, 2); // مصر, السعودية
      assert.equal(stats.withEmail, 2);
      assert.equal(stats.withPhone, 2);
      assert.equal(stats.withFederation, 2);
    });

    it("returns zero counts for empty participant array", () => {
      const stats = computeStudyStats([]);
      assert.deepEqual(stats, {
        participants: 0,
        countries: 0,
        withEmail: 0,
        withPhone: 0,
        withFederation: 0,
      });
    });
  });

  describe("aggregateAttributeCounts", () => {
    it("aggregates country frequencies sorted descending by count", () => {
      const participants: Participant[] = [
        { id: 1, studyId: 1, name: "A", country: "مصر", federation: null, email: null, phone: null, code: null, createdAt: new Date() },
        { id: 2, studyId: 1, name: "B", country: "الأردن", federation: null, email: null, phone: null, code: null, createdAt: new Date() },
        { id: 3, studyId: 1, name: "C", country: "مصر", federation: null, email: null, phone: null, code: null, createdAt: new Date() },
        { id: 4, studyId: 1, name: "D", country: "تونس", federation: null, email: null, phone: null, code: null, createdAt: new Date() },
        { id: 5, studyId: 1, name: "E", country: "مصر", federation: null, email: null, phone: null, code: null, createdAt: new Date() },
      ];

      const counts = aggregateAttributeCounts(participants, "country");
      assert.equal(counts[0][0], "مصر");
      assert.equal(counts[0][1], 3);
      assert.equal(counts.length, 3);
    });
  });

  describe("filterParticipants", () => {
    const participants: Participant[] = [
      { id: 1, studyId: 1, name: "طارق العوضي", country: "مصر", federation: "اتحاد القاهرة", email: "tarek@mail.com", phone: "123", code: "C1", createdAt: new Date() },
      { id: 2, studyId: 1, name: "عمر الهاشمي", country: "الأردن", federation: "اتحاد عمان", email: "omar@jordan.jo", phone: "456", code: "C2", createdAt: new Date() },
      { id: 3, studyId: 1, name: "ياسر المصري", country: "السعودية", federation: "اتحاد الرياض", email: null, phone: null, code: "C3", createdAt: new Date() },
    ];

    it("filters by normalized Arabic query across name", () => {
      const results = filterParticipants(participants, { search: "عوضي" });
      assert.equal(results.length, 1);
      assert.equal(results[0].name, "طارق العوضي");
    });

    it("filters by country strictly when set", () => {
      const results = filterParticipants(participants, { country: "الأردن" });
      assert.equal(results.length, 1);
      assert.equal(results[0].name, "عمر الهاشمي");
    });

    it("filters by hasEmailOnly", () => {
      const results = filterParticipants(participants, { hasEmailOnly: true });
      assert.equal(results.length, 2);
    });
  });

  describe("sortParticipants", () => {
    const p1: Participant = { id: 1, studyId: 1, name: "طارق", country: "مصر", federation: null, email: null, phone: null, code: null, createdAt: new Date("2026-01-01") };
    const p2: Participant = { id: 2, studyId: 1, name: "أحمد", country: "الأردن", federation: null, email: null, phone: null, code: null, createdAt: new Date("2026-02-01") };
    const p3: Participant = { id: 3, studyId: 1, name: "بلال", country: "تونس", federation: null, email: null, phone: null, code: null, createdAt: new Date("2026-03-01") };

    it("sorts by name alphabetically in Arabic", () => {
      const sorted = sortParticipants([p1, p2, p3], "name", "ar");
      assert.equal(sorted[0].name, "أحمد");
      assert.equal(sorted[1].name, "بلال");
      assert.equal(sorted[2].name, "طارق");
    });

    it("sorts by newest createdAt", () => {
      const sorted = sortParticipants([p1, p2, p3], "newest");
      assert.equal(sorted[0].id, 3);
      assert.equal(sorted[2].id, 1);
    });
  });

  describe("filterAndSortStudies", () => {
    const studies: StudyWithCount[] = [
      { id: 1, title: "دراسة القيادة الرياضية", year: "2025-05-10", endDate: null, description: "وصف عام", status: "active", titleEn: "Sports Leadership", descriptionEn: null, participantCount: 15, createdAt: new Date("2025-01-01") },
      { id: 2, title: "دراسة التحكيم الدولي", year: "2026-02-15", endDate: null, description: "تفاصيل التحكيم", status: "draft", titleEn: "International Refereeing", descriptionEn: null, participantCount: 30, createdAt: new Date("2026-01-01") },
    ];

    it("filters by status", () => {
      const activeOnly = filterAndSortStudies(studies, { status: "active" });
      assert.equal(activeOnly.length, 1);
      assert.equal(activeOnly[0].id, 1);
    });

    it("sorts by participants count descending", () => {
      const byCount = filterAndSortStudies(studies, { sort: "participants" });
      assert.equal(byCount[0].id, 2);
      assert.equal(byCount[1].id, 1);
    });
  });

  describe("computeGlobalStats", () => {
    it("computes system-wide totals", () => {
      const studies: StudyWithCount[] = [
        { id: 1, title: "S1", year: "2026", endDate: null, description: null, status: "active", titleEn: null, descriptionEn: null, participantCount: 2, createdAt: new Date() },
      ];
      const participants: Participant[] = [
        { id: 1, studyId: 1, name: "P1", country: "مصر", federation: null, email: "p1@mail.com", phone: null, code: null, createdAt: new Date() },
        { id: 2, studyId: 1, name: "P2", country: "مصر", federation: null, email: null, phone: null, code: null, createdAt: new Date() },
      ];

      const globalStats = computeGlobalStats(studies, participants);
      assert.equal(globalStats.studies, 1);
      assert.equal(globalStats.participants, 2);
      assert.equal(globalStats.countries, 1);
      assert.equal(globalStats.withEmail, 1);
    });
  });
});
