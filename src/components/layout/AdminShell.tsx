
import { useState } from "react";
import {
  Activity,
  BadgeHelp,
  ChartNoAxesCombined,
  ClipboardCheck,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Scale,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../auth/AdminAuthContext";
import AdminNotificationBell from "../notifications/AdminNotificationBell";

type NavigationItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

const NAVIGATION: NavigationItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Tournaments", path: "/tournaments", icon: Trophy },
  { label: "Disputes", path: "/disputes", icon: Scale },
  { label: "Result queue", path: "/results", icon: ClipboardCheck },
  { label: "Payments", path: "/finance/payments", icon: Wallet },
  { label: "Award payouts", path: "/finance/payouts", icon: ChartNoAxesCombined },
  { label: "Players", path: "/players", icon: Users },
  { label: "Support desk", path: "/support", icon: LifeBuoy },
  { label: "Staff & invitations", path: "/governance/staff", icon: ShieldCheck },
  { label: "Audit explorer", path: "/governance/audit", icon: Activity },
];

const MOBILE_PRIMARY_PATHS = [
  "/",
  "/tournaments",
  "/results",
];

function isPrimaryMobileItem(item: NavigationItem) {
  return MOBILE_PRIMARY_PATHS.includes(item.path);
}

function getPageTitle(pathname: string) {
  const matchingItem = [...NAVIGATION]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) =>
      item.path === "/"
        ? pathname === "/"
        : pathname === item.path ||
          pathname.startsWith(`${item.path}/`),
    );

  return matchingItem?.label ?? "Operations";
}


function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/favicon.svg"
        alt="KTMS"
        className="h-10 w-10 shrink-0 rounded-xl"
      />

      <div className="min-w-0">
        <p className="font-bold tracking-wide text-text">KTMS</p>
        <p className="text-xs text-muted">Operations console</p>
      </div>
    </div>
  );
}


function SidebarLink({
  item,
  onNavigate,
}: {
  item: NavigationItem;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
          isActive
            ? "border border-cyan/20 bg-cyan/10 font-semibold text-cyan"
            : "border border-transparent text-muted hover:bg-surface hover:text-text",
        ].join(" ")
      }
    >
      <Icon size={18} className="shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function AdminShell() {
  const { session, signOut } = useAdminAuth();
  const location = useLocation();

  const [moreOpen, setMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const pageTitle = getPageTitle(location.pathname);
  const mobileMoreItems = NAVIGATION.filter(
    (item) => !isPrimaryMobileItem(item),
  );

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError("");

    try {
      await signOut();
    } catch (error: unknown) {
      setSignOutError(
        error instanceof Error
          ? error.message
          : "Sign out failed. Please try again.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* Desktop navigation */}
        <aside className="hidden border-r border-border bg-panel lg:flex lg:flex-col">
          <div className="border-b border-border p-5">
            <Brand />
          </div>

          <div className="px-4 py-5">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Workspace
            </p>

            <nav aria-label="Main navigation" className="space-y-1">
              {NAVIGATION.map((item) => (
                <SidebarLink key={item.path} item={item} />
              ))}
            </nav>
          </div>

          <div className="mt-auto border-t border-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green" />
              <span className="text-xs text-muted">
                Admin session active
              </span>
            </div>
            <p className="break-all text-xs text-muted">
              {session?.user.email ?? "Authenticated administrator"}
            </p>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted hover:bg-surface hover:text-text disabled:opacity-50"
            >
              <LogOut size={17} />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>

        {/* Main workspace */}
        <div className="flex min-h-screen min-w-0 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="lg:hidden">
                  <Brand />
                </div>

                <div className="hidden min-w-0 lg:block">
                  <p className="text-xs text-muted">
                    Global operations
                  </p>
                  <h1 className="truncate text-lg font-semibold">
                    {pageTitle}
                  </h1>
                </div>

                <div className="min-w-0 lg:hidden">
                  <p className="truncate text-sm font-semibold">
                    {pageTitle}
                  </p>
                  <p className="text-xs text-muted">
                    Admin workspace
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                aria-label="Sign out"
                title="Sign out"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border text-muted hover:border-cyan hover:text-cyan disabled:opacity-50 lg:hidden"
              >
                <LogOut size={18} />
              </button>

              <div className="hidden max-w-64 items-center gap-2 text-sm text-muted lg:flex">
                <span className="h-2 w-2 shrink-0 rounded-full bg-green" />
                <span className="truncate">
                  {session?.user.email ?? "Admin session"}
                </span>
              </div>
              
              <AdminNotificationBell />
            </div>
          </header>

          {signOutError && (
            <div
              role="alert"
              className="mx-4 mt-4 rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm text-coral sm:mx-6 lg:mx-8"
            >
              {signOutError}
            </div>
          )}

          <main className="min-w-0 flex-1 pb-24 lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="grid min-h-16 grid-cols-4">
          {NAVIGATION.filter(isPrimaryMobileItem).map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  [
                    "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs",
                    isActive ? "text-cyan" : "text-muted",
                  ].join(" ")
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <button
            type="button"
            aria-expanded={moreOpen}
            aria-label={moreOpen ? "Close more navigation" : "More navigation"}
            onClick={() => setMoreOpen((open) => !open)}
            className={[
              "flex min-h-16 flex-col items-center justify-center gap-1 text-xs",
              moreOpen ? "text-cyan" : "text-muted",
            ].join(" ")}
          >
            {moreOpen ? <X size={19} /> : <Menu size={19} />}
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Mobile secondary navigation */}
      {moreOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          <section className="absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] max-h-[70vh] overflow-y-auto rounded-t-2xl border border-border bg-panel p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">All workspaces</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:bg-surface"
              >
                <X size={19} />
              </button>
            </div>

            <nav aria-label="Additional navigation" className="space-y-1">
              {mobileMoreItems.map((item) => (
                <SidebarLink
                  key={item.path}
                  item={item}
                  onNavigate={() => setMoreOpen(false)}
                />
              ))}
            </nav>

            <div className="mt-4 border-t border-border pt-3">
              <p className="break-all text-xs text-muted">
                {session?.user.email ?? "Authenticated administrator"}
              </p>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                <BadgeHelp size={15} />
                Access is enforced by the backend.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminShell;
