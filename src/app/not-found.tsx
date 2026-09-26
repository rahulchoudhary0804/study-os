import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 text-primary">
        <Compass className="size-8" aria-hidden />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">This page isn&apos;t on the syllabus</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you back
          to studying.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">
          <Home className="size-4" /> Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
