import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 space-y-2">
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Skeleton className="h-5 w-48" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 space-y-3">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-1.5 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
