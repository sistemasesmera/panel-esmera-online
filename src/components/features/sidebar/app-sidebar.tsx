"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Kanban, GraduationCap, BookOpen,
  BookMarked, ScrollText, Settings, LogOut, CalendarCheck, CalendarDays, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/domain/shared/permissions";
import { AutomationsDrawer } from "./automations-drawer";

type NavItem  = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; roles?: AppRole[] };
type NavGroup = { label?: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard",  href: "/dashboard",    icon: LayoutDashboard },
    ],
  },
  {
    label: "Comercial",
    items: [
      { label: "Pipeline",   href: "/crm/pipeline", icon: Kanban,        roles: ["setter", "closer", "administracion"] },
      { label: "Agenda",     href: "/agenda",        icon: CalendarDays,  roles: ["setter", "closer", "administracion"] },
    ],
  },
  {
    label: "Académico",
    items: [
      { label: "Alumnos",    href: "/students",     icon: GraduationCap, roles: ["setter", "closer", "administracion"] },
      { label: "Matrículas", href: "/enrollments",  icon: BookMarked,    roles: ["setter", "closer", "administracion", "tutor"] },
      { label: "Cursos",     href: "/courses",      icon: BookOpen,      roles: ["setter", "closer", "administracion"] },
      { label: "Tutorías",   href: "/tutoring",     icon: CalendarCheck, roles: ["tutor", "administracion"] },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Logs",       href: "/logs",         icon: ScrollText,   roles: ["administracion"] },
      { label: "Usuarios",   href: "/admin/users",  icon: Settings,     roles: ["administracion"] },
    ],
  },
];

const ROLE_LABELS: Record<AppRole, string> = {
  setter:         "Setter",
  closer:         "Closer",
  administracion: "Administración",
  tutor:          "Tutor",
};

const ROLE_COLORS: Record<AppRole, string> = {
  setter:         "bg-sky-50 text-sky-600 ring-1 ring-sky-200/60",
  closer:         "bg-violet-50 text-violet-600 ring-1 ring-violet-200/60",
  administracion: "bg-teal-50 text-teal-600 ring-1 ring-teal-200/60",
  tutor:          "bg-amber-50 text-amber-600 ring-1 ring-amber-200/60",
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

export function AppSidebar({
  role,
  userName,
  signOut,
}: {
  role:     AppRole;
  userName: string;
  signOut:  () => Promise<void>;
}) {
  const pathname = usePathname();
  const [automationsOpen, setAutomationsOpen] = useState(false);

  return (
    <>
    <aside
      className="flex h-full w-60 flex-col shrink-0 select-none"
      style={{ background: "var(--sb-bg)", borderRight: "1px solid var(--sb-border)" }}
    >

      {/* ── Logo ── */}
      <div className="flex items-center justify-center px-8 h-[72px] shrink-0" style={{ borderBottom: "1px solid var(--sb-border)" }}>
        <Image
          src="/esmera-logo.png"
          alt="Esmera Online"
          width={160}
          height={48}
          className="h-10 w-auto object-contain"
          priority
        />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 sb-scroll" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {GROUPS.map((group, gi) => {
          const visible = group.items.filter(item => !item.roles || item.roles.includes(role));
          if (!visible.length) return null;

          return (
            <div key={gi}>
              {group.label && (
                <p
                  className="text-[9px] font-black uppercase tracking-[0.12em] mb-1 px-3"
                  style={{ color: "var(--sb-muted)", letterSpacing: "0.14em" }}
                >
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon   = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn("sb-link", active && "sb-active")}
                    >
                      <Icon className="h-[15px] w-[15px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Automations trigger (admin only) ── */}
      {role === "administracion" && (
        <div className="px-3 pb-1 shrink-0">
          <button
            onClick={() => setAutomationsOpen(true)}
            title="Automatizaciones"
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
            style={{ color: "var(--sb-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--sb-fg)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--sb-muted)")}
          >
            <Zap className="h-3 w-3 shrink-0" />
            <span>Automatizaciones</span>
          </button>
        </div>
      )}

      {/* ── User ── */}
      <div className="px-3 py-3 shrink-0" style={{ borderTop: "1px solid var(--sb-border)" }}>
        {/* User card */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1"
          style={{ background: "var(--sb-bg2)" }}
        >
          {/* Avatar */}
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-black text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #1ab5c0 0%, #0a8a94 100%)" }}
          >
            {getInitials(userName)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold truncate leading-none mb-0.5" style={{ color: "var(--sb-fg)" }}>
              {userName}
            </p>
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-block leading-none", ROLE_COLORS[role])}>
              {ROLE_LABELS[role]}
            </span>
          </div>
        </div>

        {/* Sign out */}
        <form action={signOut}>
          <button type="submit" className="sb-signout">
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>

    <AutomationsDrawer open={automationsOpen} onClose={() => setAutomationsOpen(false)} />
    </>
  );
}
