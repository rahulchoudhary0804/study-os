import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { RobotFab } from "@/components/study-robot/robot-fab";
import { PageTransition } from "@/components/nav/page-transition";
import { getUserRank } from "@/server/queries/rank";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, email } = await requireUser();
  const [streak, rank] = await Promise.all([
    prisma.streak.findUnique({ where: { userId: profile.id } }),
    getUserRank(profile.id),
  ]);

  return (
    <div className="flex-1 flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar email={email} currentStreak={streak?.currentStreak ?? 0} rank={rank} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto pb-28 md:pb-20">
          <div className="mx-auto max-w-6xl px-4 md:px-8 py-6">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
      <BottomNav />
      <RobotFab />
    </div>
  );
}
