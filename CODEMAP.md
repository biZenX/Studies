# 🗺️ Studies — Code Map & Error Inventory

> مسح كامل للمشروع (Scanning) — خريطة الملفات + كشف أخطاء UI/UX  
> **آخر تحديث: 2026-09-25** (بعد إزالة كل native selects + استعادة StudyDetail)

---

## 1. خريطة الموقع (Site Architecture)

```
┌────────────────────────────────────────────────────────────┐
│                        Browser / PWA                         │
│                   (rhmanbit.workers.dev)                     │
└────────────────────────────┬─────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │   src/app/layout.tsx     │  ← Shell + Fonts + Providers
              │   AppShell + Lang + Toast│
              └────────────┬────────────┘
                           │
         ┌────────────────┼────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐    ┌──────▼──────┐
    │  /      │      │ /studies  │    │ /studies/id │
    │ page.tsx│      │  (list)   │    │  (detail)   │
    │Dashboard│      │           │    │ + /edit     │
    └────┬────┘      └─────┬─────┘    └──────┬──────┘
         │                 │                 │
         ▼                 ▼                 ▼
   StudiesDashboard   StudyModal      StudyDetail
   StudyForm          StudyForm       ParticipantModal
                                      ImportModal
                                      ExportModal
                                      EmailModal
                                      StudyEditForm
```

### تدفق البيانات (Data Flow)

```
UI Components
    │  fetch / mutate
    ▼
src/app/api/*          (Next.js Route Handlers)
    │
    ▼
src/lib/storage.ts     (Cloudflare D1 / local)
    │
    ▼
src/db/schema.ts       (Drizzle schema)
```

Domain logic (pure, no UI):
- `src/domain/rosterEngine.ts` — قواعد كشف المشاركين
- `src/domain/studySchedule.ts` — جدول الدراسة / الأيام المتبقية

---

## 2. خريطة الملفات (File Map)

### Presentation — `src/app`

| ملف | الدور | ملاحظات |
|-----|-------|---------|
| `layout.tsx` | Root layout, خطوط IBM Plex Sans Arabic | OK |
| `globals.css` | Design tokens (`--s-1`…`--s-9`), scroll, inputs | OK |
| `page.tsx` | الصفحة الرئيسية → Dashboard | OK |
| `loading.tsx` / `error.tsx` / `not-found.tsx` | حالات النظام | OK |
| `studies/[id]/page.tsx` | صفحة تفاصيل دراسة | OK |
| `studies/[id]/edit/page.tsx` | تعديل دراسة | OK |

### UI Components — `src/components`

| ملف | الحجم | الدور | حالة UI |
|-----|-------|-------|---------|
| `ui.tsx` | ~19KB | Modal, AppSelect, Buttons, Icons | ✅ Modal + AppSelect جاهزين |
| `AppShell.tsx` | ~5KB | Header + main layout | OK |
| `StudiesDashboard.tsx` | ~19KB | قائمة الدراسات + بحث + فرز | ✅ AppSelect للفرز |
| `StudyDetail.tsx` | ~44KB | كشف المشاركين + فلاتر | ✅ 3× AppSelect (دولة/اتحاد/فرز) |
| `StudyForm.tsx` | ~16KB | إنشاء دراسة | OK |
| `StudyEditForm.tsx` | ~8KB | تعديل دراسة | OK |
| `StudyModal.tsx` | ~5KB | غلاف modal لإنشاء دراسة | يعتمد على Modal |
| `ParticipantModal.tsx` | ~10KB | إضافة/تعديل مشارك | يعتمد على Modal |
| `ImportModal.tsx` | ~26KB | استيراد Excel/CSV | ✅ AppSelect لربط الأعمدة |
| `ExportModal.tsx` | ~19KB | تصدير HTML | ✅ chips (لا select) |
| `EmailModal.tsx` | ~11KB | إرسال بريد (Brevo) | OK |
| `lang.tsx` | ~3KB | تبديل AR/EN | OK |
| `toast.tsx` | ~5KB | إشعارات | OK |
| `PwaRegister.tsx` | ~2KB | Service Worker | OK |
| `useMediaQuery.ts` | ~3KB | breakpoints | OK |

### Domain — `src/domain`

| ملف | الدور |
|-----|-------|
| `rosterEngine.ts` | منطق الكشف والترقيم والفلترة |
| `studySchedule.ts` | حساب الأيام المتبقية / الحالة |
| `*.test.ts` | اختبارات الوحدة |

### Lib — `src/lib`

| ملف | الدور |
|-----|-------|
| `types.ts` | أنواع TypeScript الأساسية |
| `i18n.ts` | ترجمات AR/EN |
| `storage.ts` | طبقة التخزين (D1) |
| `exporter.ts` | توليد تقرير HTML للتصدير |
| `parsers.ts` | قراءة Excel/CSV |
| `content.ts` | توطين عناوين الدراسات |
| `brevo.ts` | إرسال الإيميل |
| `queries.ts` / `seed.ts` / `seed-data.ts` | استعلامات وبذر بيانات |

### DB — `src/db`

| ملف | الدور |
|-----|-------|
| `schema.ts` | جداول studies / participants |
| `index.ts` | اتصال Drizzle |

### API — `src/app/api`

| مسار | الوظيفة |
|------|---------|
| `GET/POST /api/studies` | قائمة / إنشاء |
| `GET/PATCH/DELETE /api/studies/[id]` | تفاصيل دراسة |
| `.../participants` | مشاركو دراسة |
| `.../send` | إرسال إيميل |
| `PATCH/DELETE /api/participants/[id]` | تعديل/حذف مشارك |
| `/api/health` / `/api/config` | صحة النظام |

---

## 3. كشف الأخطاء (Error Inventory) — محدّث 2026-09-25

### حرج — Native OS Controls (قوائم النظام)

| # | الملف | الاستخدام | الحالة |
|---|-------|-----------|--------|
| 1 | `ExportModal.tsx` | لغة، ورق، اتجاه... | ✅ chips |
| 2 | `StudiesDashboard.tsx` | فرز القائمة | ✅ AppSelect |
| 3 | `StudyDetail.tsx` | فلتر دولة | ✅ AppSelect |
| 4 | `StudyDetail.tsx` | فلتر اتحاد | ✅ AppSelect |
| 5 | `StudyDetail.tsx` | فرز المشاركين | ✅ AppSelect |
| 6 | `ImportModal.tsx` | ربط عمود Excel | ✅ AppSelect |

**النتيجة:** `grep -rn '<select' src/` → **صفر** نتائج. لا توجد قوائم نظام.

### متوسط — Modal / Scroll / Responsive

| # | المشكلة | أين | الحالة |
|---|---------|-----|--------|
| 7 | الصفحة مش بتعمل scroll | `globals.css` + AppShell | ✅ `overflow-y: auto !important` + `100dvh` |
| 8 | الـ popup ينزل لأسفل | `ui.tsx` Modal | ✅ `items-center` + `max-h-[min(90dvh,820px)]` |
| 9 | الـ modal مش بيسكرول جوا | `.modal-scroll` | ✅ `min-h-0 flex-1 overflow-y-auto overscroll-contain` |
| 10 | على PC لازم تصغير 30% | Modal max-width + density | ⏳ راقب في browser loop |
| 11 | الـ backdrop | Modal overlay | ✅ `bg-black/40` |
| 12 | spacing / margin / padding | Dashboard, Detail, Forms | ✅ tokens موجودة (`--s-1`…`--s-9`) — راقب الاتساق |
| 13 | أزرار/حقول أقل من 44px | أماكن متعددة | ✅ AppSelect `min-h-[44px]` — راقب الباقي |

### تحسينات UI/UX (P1/P2)

| # | البند | ملاحظة |
|---|-------|--------|
| 14 | Mobile-first | معظم الشاشات responsive بالفعل |
| 15 | Hierarchy بصرية في StudyDetail | البطاقة العلوية — راقب الكثافة |
| 16 | النصوص الطويلة للوالد | تبسيط i18n لاحقاً |
| 17 | Consistency في border-radius | tokens: 12/16/20 |
| 18 | Empty states | موجودة في Dashboard + Detail |

---

## 4. خطة الإصلاح حسب الأولوية

```
تم (P0) — 2026-09-25
├── ✅ ExportModal → chips
├── ✅ ui.tsx → AppSelect موحّد
├── ✅ StudiesDashboard sort
├── ✅ StudyDetail filters (3)
├── ✅ ImportModal column mapper
└── ✅ StudyDetail.tsx استُعيد كاملاً (لا placeholder)

جاري / راقب (P1)
├── Browser loop على live + أجهزة متعددة
├── أي touch target < 44px متبقي
├── كثافة StudyDetail header إن لزم
└── تأكيد عدم وجود zoom إجباري على desktop

لاحقاً (P2)
├── تبسيط النصوص للوالد
├── Empty states أقوى
└── Performance (lazy modals)
```

---

## 5. قواعد بناء الموقع (مرجع سريع)

| المبدأ | التطبيق هنا |
|--------|-------------|
| Separation of Concerns | domain ≠ UI ≠ storage |
| Mobile First | ابدأ من الشاشة الصغيرة |
| Consistency | نفس Modal / نفس AppSelect في كل مكان |
| KISS | تحكمات بسيطة للوالد — مش قوائم نظام |
| Accessibility | labels، aria، focus trap في Modal |
| Responsive | اشتغل على 360px → 1920px بدون zoom |

---

## 6. رموز الحالة

- ✅ تم الإصلاح
- ⏳ قيد التنفيذ / مخطط
- ⚠️ معروف ولم يُغلق بعد
- 🔴 حرج للمستخدم النهائي (الوالد)

---

*هذا الملف هو خريطة حية — يُحدّث مع كل دفعة إصلاحات.*  
*IMPLEMENTATION_PLAN.md موجود في الجذر ويوثّق الخطوات قبل أي كود.*
