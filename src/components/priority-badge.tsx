import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRIORITY_MAP: Record<number, { emoji: string; label: string; className: string }> = {
  1: { emoji: "🔴", label: "Priority 1", className: "bg-red-100 text-red-700 hover:bg-red-100" },
  2: { emoji: "🟠", label: "Priority 2", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  3: { emoji: "🟡", label: "Priority 3", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
  4: { emoji: "🟢", label: "Priority 4", className: "bg-green-100 text-green-700 hover:bg-green-100" },
};

export function PriorityBadge({ priority, className }: { priority: number; className?: string }) {
  const p = PRIORITY_MAP[priority] ?? PRIORITY_MAP[3];
  return (
    <Badge variant="secondary" className={cn(p.className, className)}>
      {p.emoji} {p.label}
    </Badge>
  );
}

const STATUS_MAP: Record<string, { emoji: string; label: string; className: string }> = {
  NOT_STARTED: { emoji: "⚪", label: "Not Started", className: "bg-muted text-muted-foreground" },
  LEARNING: { emoji: "🟡", label: "Learning", className: "bg-yellow-100 text-yellow-700" },
  PRACTICING: { emoji: "🔵", label: "Practicing", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { emoji: "🟢", label: "Completed", className: "bg-green-100 text-green-700" },
  NEEDS_REVISION: { emoji: "🔴", label: "Needs Revision", className: "bg-red-100 text-red-700" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.NOT_STARTED;
  return (
    <Badge variant="secondary" className={cn(s.className, className)}>
      {s.emoji} {s.label}
    </Badge>
  );
}

export { PRIORITY_MAP, STATUS_MAP };
