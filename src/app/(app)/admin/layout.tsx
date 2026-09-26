import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ShieldCheck } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  if (!profile.isAdmin) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-border bg-primary/[0.06] px-5 py-4">
        <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold text-primary">
          <ShieldCheck className="size-4" />
          Admin Panel
        </Link>
        <p className="text-xs text-muted-foreground mt-1">
          Separate from the regular student app — cross-user analytics and syllabus content management.
        </p>
        <AdminTabs />
      </div>
      {children}
    </div>
  );
}
