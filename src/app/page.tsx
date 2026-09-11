import { ensureSeed } from "@/lib/seed";
import { getDashboardData } from "@/lib/queries";
import { StudiesDashboard } from "@/components/StudiesDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeed();
  const { studies, stats } = await getDashboardData();

  return <StudiesDashboard initialStudies={studies} initialStats={stats} />;
}
