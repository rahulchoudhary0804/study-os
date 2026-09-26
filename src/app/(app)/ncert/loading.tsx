import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NcertLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-2/3 max-w-2xl" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="divide-y">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-8 w-24 shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
