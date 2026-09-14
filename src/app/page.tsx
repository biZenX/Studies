import { ensureSeed } from "@/lib/seed";
import { getDashboardData } from "@/lib/queries";
import { StudiesDashboard } from "@/components/StudiesDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let studies = null;
  let stats = null;

  if (process.env.DATABASE_URL) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database timeout")), 3000)
      );

      const data = await Promise.race([
        (async () => {
          await ensureSeed();
          return await getDashboardData();
        })(),
        timeoutPromise,
      ]);

      studies = data.studies;
      stats = data.stats;
    } catch (error) {
      console.warn("Database not reachable, operating in Local-First mode:", error);
    }
  }

  return <StudiesDashboard initialStudies={studies} initialStats={stats} />;
}
