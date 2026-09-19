import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, generateStudyHtmlReport } from "@/lib/exporter";
import { buildEmailHtml } from "@/lib/brevo";
import type { Participant, Study } from "@/lib/types";

describe("Security by Default: Sanitization & Anti-XSS", () => {
  describe("escapeHtml", () => {
    it("neutralizes script tags, double quotes, single quotes, and angle brackets", () => {
      const malicious = `<script>alert('XSS & "hack"')</script>`;
      const clean = escapeHtml(malicious);
      assert.ok(!clean.includes("<script>"));
      assert.ok(!clean.includes("</script>"));
      assert.ok(clean.includes("&lt;script&gt;"));
      assert.ok(clean.includes("&amp;"));
      assert.ok(clean.includes("&quot;"));
      assert.ok(clean.includes("&#039;"));
    });

    it("handles null and undefined gracefully", () => {
      assert.equal(escapeHtml(null), "");
      assert.equal(escapeHtml(undefined), "");
    });
  });

  describe("generateStudyHtmlReport with malicious payloads", () => {
    it("escapes malicious participant fields in exported document", () => {
      const maliciousStudy: Pick<Study, "title" | "year" | "description"> = {
        title: `Study <script>alert('title')</script>`,
        year: `2026"<script>`,
        description: `Description with <b>HTML</b> & "quotes"`,
      };

      const maliciousParticipants: Participant[] = [
        {
          id: 1,
          studyId: 1,
          name: `"><script>alert('name')</script>`,
          country: `"><img src=x onerror=alert(1)>`,
          federation: `Federation <svg/onload=alert(2)>`,
          email: `test@test.com" onfocus="alert(3)`,
          phone: `123" onclick="alert(4)`,
          code: `CODE<script>`,
          createdAt: new Date(),
        },
      ];

      const html = generateStudyHtmlReport(maliciousStudy, maliciousParticipants, {
        footerNote: `<script>alert('footer')</script>`,
      });

      // No executable script tags or inline handlers
      assert.ok(!html.includes("<script>alert('title')</script>"));
      assert.ok(!html.includes("<script>alert('name')</script>"));
      assert.ok(!html.includes("<script>alert('footer')</script>"));
      assert.ok(!html.includes("<img src=x onerror=alert(1)>"));
      assert.ok(!html.includes("<svg/onload=alert(2)>"));
      assert.ok(!html.includes(`" onfocus="alert(3)`));
      assert.ok(!html.includes(`" onclick="alert(4)`));
    });
  });

  describe("buildEmailHtml security", () => {
    it("escapes user-supplied title and message in email templates", () => {
      const html = buildEmailHtml({
        studyTitle: `Title <script>evil()</script>`,
        year: `2026 <style>body{display:none}</style>`,
        message: `Hello\n<script>alert(1)</script>\nWorld`,
      });

      assert.ok(!html.includes("<script>evil()</script>"));
      assert.ok(!html.includes("<script>alert(1)</script>"));
      assert.ok(!html.includes("<style>body{display:none}</style>"));
      assert.ok(html.includes("&lt;script&gt;"));
      assert.ok(html.includes("Hello<br>"));
    });
  });
});
