import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-7 w-40" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <Card key={j}>
                <CardContent className="pt-4 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-1.5 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
