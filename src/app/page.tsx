import { ensureSeed } from "@/lib/seed";
import { getDashboardData } from "@/lib/queries";
import { StudiesDashboard } from "@/components/StudiesDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let studies = null;
  let stats = null;

  try {
    await ensureSeed();
    const data = await getDashboardData();
    studies = data.studies;
    stats = data.stats;
  } catch (error) {
    // Server database is not connected or running offline.
    // Client-side LocalStorage will provide data automatically.
    console.warn("Database not reachable, operating in Local-First mode:", error);
  }

  return <StudiesDashboard initialStudies={studies} initialStats={stats} />;
}
