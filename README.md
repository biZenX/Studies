# Studies — نظام إدارة الدراسات والكشوف

> تطبيق ويب لوالدك: دراسات، مشاركون، استيراد، تصدير، وإرسال بريد — بواجهة عربية/إنجليزية بسيطة.

**Live:** [rhmanbit.workers.dev](https://rhmanbit.workers.dev)  
**Repo:** [biZenX/Studies](https://github.com/biZenX/Studies)

---

## خريطة الموقع

```text
                    ┌──────────────┐
                    │   AppShell   │  header + لغة + عنوان
                    └──────┬──────┘
           ┌──────────────┼───────────────┐
           ▼               ▼               ▼
     ┌──────────┐   ┌────────────┐  ┌─────────────┐
     │ Dashboard│   │Study Detail│  │ Study Edit  │
     │ الدراسات │   │   الكشف    │  │   تعديل     │
     └────┬─────┘   └─────┬──────┘  └─────────────┘
          │               │
          │         ┌─────┼───────────────────┐
          │         ▼          ▼        ▼    ▼
          │    Participant  Import   Export Email
          │      Modal      Modal    Modal  Modal
          ▼
     Study Modal (إنشاء دراسة)
```

للتفصيل الكامل عن كل ملف وأخطاء UI المعروفة → **[CODEMAP.md](./CODEMAP.md)**

---

## المجلدات باختصار

| المسار | المعنى |
|--------|--------|
| `src/app` | صفحات Next.js (App Router) + API |
| `src/components` | واجهة المستخدم (Dashboard, Modals, UI kit) |
| `src/domain` | منطق الأعمال بدون UI |
| `src/lib` | تخزين، تصدير، ترجمة، parsers |
| `src/db` | مخطط قاعدة البيانات (Drizzle) |
| `public` | أيقونات PWA + service worker |

---

## التقنيات

- **Next.js** (App Router) + TypeScript  
- **Tailwind CSS** + ثيم فاتح ثابت  
- **خط:** IBM Plex Sans Arabic  
- **قاعدة بيانات:** Cloudflare D1 (Drizzle)  
- **نشر:** OpenNext → Cloudflare Workers  
- **إيميل:** Brevo  

---

## تشغيل محلي

```bash
npm install
cp .env.example .env.local   # املأ المتغيرات
npm run dev
```

---

## حالة إصلاحات UI (مختصر)

| البند | الحالة |
|-------|--------|
| Scroll الصفحة | ✅ |
| Modal في المنتصف + scroll داخلي | ✅ |
| ExportModal بدون قائمة نظام | ✅ chips |
| فلاتر Dashboard / Detail / Import | ✅ AppSelect (صفر native select) |
| Responsive (موبايل → دسكتوب) | ✅ أساسي جاهز — راقب في المتصفح |
| مساحات / padding / hierarchy | ✅ tokens موجودة — راقب الاتساق |

التفاصيل والسطور → [CODEMAP.md](./CODEMAP.md)  
خطة التنفيذ → [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

---

## مبادئ التصميم المعتمدة هنا

1. **التحكم من داخل الموقع** — مش قوائم نظام التشغيل  
2. **Mobile first** ثم التابلت والدسكتوب  
3. **بساطة للوالد** — أزرار واضحة، نصوص قصيرة  
4. **اتساق** — نفس الـ Modal ونفس أنماط الأزرار في كل الشاشات  
