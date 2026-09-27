import {
  LayoutDashboard,
  BookOpen,
  Target,
  Library,
  NotebookPen,
  FlaskConical,
  RefreshCw,
  BarChart3,
  Flame,
  Bot,
  MessageCircle,
  FileDown,
  Settings,
  BookMarked,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Position in the mobile bottom nav (1 = leftmost); omitted items live under "More". */
  mobileOrder?: number;
  /** Reached through the floating AI pencil on mobile, so it's left out of "More". */
  fab?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobileOrder: 3 },
  { href: "/study", label: "Study", icon: BookOpen, mobileOrder: 1 },
  { href: "/plan", label: "Today's Plan", icon: Target, mobileOrder: 2 },
  { href: "/subjects", label: "Subjects", icon: Library },
  { href: "/ncert", label: "NCERT", icon: BookMarked, mobileOrder: 4 },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/practice", label: "Practice", icon: FlaskConical },
  { href: "/revision", label: "Revision", icon: RefreshCw },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/streak", label: "Streak", icon: Flame },
  { href: "/planner", label: "AI Planner", icon: Bot },
  { href: "/assistant", label: "AI Assistant", icon: MessageCircle, fab: true },
  { href: "/export", label: "PDF Export", icon: FileDown },
  { href: "/settings", label: "Settings", icon: Settings },
];
