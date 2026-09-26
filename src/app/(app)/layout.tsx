import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { PageTransition } from "@/components/nav/page-transition";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, email } = await requireUser();
  const streak = await prisma.streak.findUnique({ where: { userId: profile.id } });

  return (
    <div className="flex-1 flex h-screen overflow-hidden">
      <Sidebar isAdmin={profile.isAdmin} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar email={email} currentStreak={streak?.currentStreak ?? 0} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 md:px-8 py-6">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
