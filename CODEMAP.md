# 🗺️ Studies — Code Map & Error Inventory

> مسح كامل للمشروع (Scanning) — خريطة الملفات + كشف أخطاء UI/UX
> آخر تحديث: 2026-09-24

---

## 1. خريطة الموقع (Site Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / PWA                         │
│                   (rhmanbit.workers.dev)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │   src/app/layout.tsx     │  ← Shell + Fonts + Providers
              │   AppShell + Lang + Toast│
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────┐
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
| `globals.css` | Design tokens, scroll, inputs | يحتاج مراجعة spacing scale |
| `page.tsx` | الصفحة الرئيسية → Dashboard | OK |
| `loading.tsx` / `error.tsx` / `not-found.tsx` | حالات النظام | OK |
| `studies/[id]/page.tsx` | صفحة تفاصيل دراسة | OK |
| `studies/[id]/edit/page.tsx` | تعديل دراسة | OK |

### UI Components — `src/components`

| ملف | الحجم | الدور | حالة UI |
|-----|-------|-------|---------|
| `ui.tsx` | ~19KB | Modal, Buttons, Icons, primitives | Modal مُحسَّن جزئياً |
| `AppShell.tsx` | ~5KB | Header + main layout | OK بعد تعديلات scroll |
| `StudiesDashboard.tsx` | ~19KB | قائمة الدراسات + بحث + فرز | ⚠️ native `<select>` للفرز |
| `StudyDetail.tsx` | ~44KB | كشف المشاركين + فلاتر | ⚠️ 3× native `<select>` |
| `StudyForm.tsx` | ~16KB | إنشاء دراسة | مراجعة spacing |
| `StudyEditForm.tsx` | ~8KB | تعديل دراسة | OK نسبياً |
| `StudyModal.tsx` | ~5KB | غلاف modal لإنشاء دراسة | يعتمد على Modal |
| `ParticipantModal.tsx` | ~10KB | إضافة/تعديل مشارك | يعتمد على Modal |
| `ImportModal.tsx` | ~26KB | استيراد Excel/CSV | ⚠️ native `<select>` لربط الأعمدة |
| `ExportModal.tsx` | ~19KB | تصدير HTML | ✅ تم استبدال selects بـ chips |
| `EmailModal.tsx` | ~11KB | إرسال بريد (Brevo) | مراجعة |
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

## 3. كشف الأخطاء (Error Inventory)

### حرج — Native OS Controls (قوائم النظام)

المشكلة: `<select>` يفتح قائمة أندرويد/iOS السوداء — مش جزء من تصميم الموقع.

| # | الملف | السطور تقريباً | الاستخدام | الحل |
|---|-------|----------------|-----------|------|
| 1 | `ExportModal.tsx` | كان ~78 | لغة، ورق، اتجاه... | ✅ **تم** → Choice chips |
| 2 | `StudiesDashboard.tsx` | ~286 | فرز القائمة | ⏳ استبدال بـ AppSelect |
| 3 | `StudyDetail.tsx` | ~631 | فلتر دولة | ⏳ AppSelect (قائمة ديناميكية) |
| 4 | `StudyDetail.tsx` | ~650 | فلتر اتحاد | ⏳ AppSelect |
| 5 | `StudyDetail.tsx` | ~669 | فرز المشاركين | ⏳ AppSelect / chips |
| 6 | `ImportModal.tsx` | ~68 | ربط عمود Excel | ⏳ AppSelect (ديناميكي) |

### متوسط — Modal / Scroll / Responsive

| # | المشكلة | أين | الحالة |
|---|---------|-----|--------|
| 7 | الصفحة مش بتعمل scroll على بعض الأجهزة | `globals.css` + AppShell | ✅ جزئي (dvh + overflow) |
| 8 | الـ popup ينزل لأسفل ويحتاج scroll طويل | `ui.tsx` Modal | ✅ جزئي (items-center + max-h) |
| 9 | الـ modal مش بيسكرول جوا بالكامل | `.modal-scroll` | ✅ جزئي |
| 10 | على PC لازم تصغير 30% عشان تشوف الكل | Modal max-width + content density | ⏳ يحتاج ضبط size + padding |
| 11 | الـ backdrop / الإضاءة | Modal overlay | ✅ `bg-black/40` |
| 12 | spacing / margin / padding غير متسق | Dashboard, Detail, Forms | ⏳ Design system scale |
| 13 | أزرار/حقول أقل من 44px touch target | أماكن متعددة | ⏳ |

### تحسينات UI/UX

| # | البند | ملاحظة |
|---|-------|--------|
| 14 | Mobile-first incomplete | بعض الجريدات تبدأ desktop |
| 15 | Hierarchy بصرية ضعيفة في StudyDetail | البطاقة العلوية مزدحمة |
| 16 | النصوص الطويلة للوالد | تبسيط النسخ في i18n |
| 17 | Consistency في border-radius | خلط 14px / 16px / 2xl |
| 18 | Empty states | بعض الشاشات فاضية بدون توجيه |

---

## 4. خطة الإصلاح حسب الأولوية

```
اليوم (P0)
├── ✅ ExportModal → chips
├── ⏳ ui.tsx → مكوّن AppSelect موحّد (dropdown داخل التطبيق)
├── ⏳ StudiesDashboard sort select
├── ⏳ StudyDetail filters (3)
├── ⏳ ImportModal column mapper
└── ⏳ مراجعة Modal على desktop (zoom 100%)

اليوم (P1)
├── Design tokens في globals.css (spacing 4/8/12/16/24/32)
├── Touch targets ≥ 44px
├── StudyDetail header hierarchy
└── اختبار HP lab + MacBook + iPad + Phone

لاحقاً (P2)
├── تبسيط النصوص للوالد
├── Empty states
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

*هذا الملف هو خريطة حية — يُحدَّث مع كل دفعة إصلاحات.*
