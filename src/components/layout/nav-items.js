import {
  Banknote,
  BarChart3,
  BedDouble,
  Building2,
  CalendarCheck2,
  CalendarRange,
  CreditCard,
  FileText,
  IdCard,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Plane,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";

export const NAV_SECTIONS = [
  {
    label: "Platform",
    items: [{ href: "/platform", label: "Hotels", icon: Building2, permission: "platform" }],
  },
  {
    label: "Front office",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
      { href: "/reservations", label: "Reservations", icon: CalendarRange, permission: "reservations" },
      { href: "/guests", label: "Guests", icon: Users, permission: "guests" },
      { href: "/rooms", label: "Rooms", icon: BedDouble, permission: "rooms" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/housekeeping", label: "Housekeeping", icon: Sparkles, permission: "housekeeping" },
      { href: "/agents", label: "Travel agents", icon: Plane, permission: "agents" },
      { href: "/purchases", label: "Purchases", icon: ShoppingCart, permission: "purchases" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/billing", label: "Billing", icon: CreditCard, permission: "billing" },
      { href: "/invoices", label: "Invoices", icon: FileText, permission: "invoices" },
      { href: "/accounts", label: "Accounts", icon: Landmark, permission: "accounts" },
      { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports.daily" },
    ],
  },
  {
    label: "Staff & HR",
    items: [
      { href: "/hr/employees", label: "Employees", icon: IdCard, permission: "hr" },
      { href: "/hr/attendance", label: "Attendance", icon: CalendarCheck2, permission: "attendance" },
      { href: "/hr/salary", label: "Salary", icon: Banknote, permission: "salary" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/staff", label: "User logins", icon: KeyRound, permission: "staff" },
      { href: "/settings", label: "Settings", icon: Settings, permission: "settings" },
    ],
  },
];
