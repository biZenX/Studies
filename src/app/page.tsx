import { ensureSeed } from "@/lib/seed";
import { getDashboardData } from "@/lib/queries";
import { StudiesDashboard } from "@/components/StudiesDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    await ensureSeed();
    const { studies, stats } = await getDashboardData();
    return <StudiesDashboard initialStudies={studies} initialStats={stats} />;
  } catch (error: any) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-lg w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-8 shadow-2xl space-y-4 text-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ⚙️
          </div>
          <h1 className="text-xl font-bold text-amber-300">الاتصال بقاعدة البيانات قيد الإعداد</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            الموقع يعمل بنجاح على Cloudflare Workers! لكن تعذر الوصول إلى خادم PostgreSQL.
          </p>
          <div className="p-3 bg-slate-950/80 rounded-lg text-xs font-mono text-amber-200 text-left overflow-x-auto border border-slate-800">
            {error?.message || String(error)}
          </div>
          <p className="text-xs text-slate-500">
            إذا كنت تستخدم قاعدة بيانات سحابية (مثل Supabase أو Neon)، تأكد من وضع رابط <code>DATABASE_URL</code> في إعدادات Cloudflare Workers &gt; Variables and Secrets.
          </p>
          <a
            href="/api/health"
            target="_blank"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
          >
            فحص تشخيص قاعدة البيانات (/api/health)
          </a>
        </div>
      </div>
    );
  }
}
