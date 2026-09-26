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
  /** Shown in the mobile bottom nav (keep this short — 5 max). */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/plan", label: "Today's Plan", icon: Target, mobile: true },
  { href: "/subjects", label: "Subjects", icon: Library },
  { href: "/ncert", label: "NCERT", icon: BookMarked, mobile: true },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/practice", label: "Practice", icon: FlaskConical },
  { href: "/revision", label: "Revision", icon: RefreshCw },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/streak", label: "Streak", icon: Flame },
  { href: "/planner", label: "AI Planner", icon: Bot },
  { href: "/assistant", label: "AI Assistant", icon: MessageCircle, mobile: true },
  { href: "/export", label: "PDF Export", icon: FileDown },
  { href: "/settings", label: "Settings", icon: Settings },
];
