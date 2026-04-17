"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, LogIn, LogOut, Menu, X, Sparkles, ChevronDown, Zap, Bell, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";

export function Navbar() {
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [driftAlertCount, setDriftAlertCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [driftAlerts, setDriftAlerts] = useState<Array<{ repos: { full_name: string }; drift_score: number; id: string }>>([]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Fetch drift alerts when logged in
  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/alerts/drift')
      .then(r => r.ok ? r.json() : { alerts: [] })
      .then(data => {
        setDriftAlerts(data.alerts || []);
        setDriftAlertCount((data.alerts || []).length);
      })
      .catch(() => {});
  }, [session]);

  // close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-user-menu]")) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "Roast Tool", href: "#roast", badge: "Free" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
          scrolled ? "glass-nav shadow-lg shadow-black/20" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto flex h-[62px] items-center justify-between px-4 md:px-6 max-w-7xl">
          {/* ── Logo ── */}
          <a
            href="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity group shrink-0"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 rounded-lg blur-md group-hover:bg-blue-500/40 transition-all" />
              <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            </div>
            <span className="text-[16px] font-bold tracking-tight">
              Readme<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">AI</span>
            </span>
          </a>

          {/* ── Desktop Nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative flex items-center gap-1.5 px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-md hover:bg-white/5"
              >
                {link.label}
                {link.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    {link.badge}
                  </span>
                )}
              </a>
            ))}
          </nav>

          {/* ── Right side ── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notification Bell — only show when logged in */}
            {session?.user && (
              <div className="relative" data-notif-menu>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
                  className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  aria-label="Drift alerts"
                >
                  <Bell className="h-4 w-4" />
                  {driftAlertCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">
                      {driftAlertCount > 9 ? '9+' : driftAlertCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-10 w-72 glass-card rounded-xl py-2 shadow-xl shadow-black/40 border-white/10 z-50">
                    <div className="px-3 py-2 border-b border-white/8 mb-1">
                      <p className="text-xs font-semibold text-foreground">Drift Alerts</p>
                    </div>
                    {driftAlerts.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <p className="text-xs text-muted-foreground">✅ All repos are in sync</p>
                      </div>
                    ) : (
                      driftAlerts.slice(0, 5).map((alert) => (
                        <a
                          key={alert.id}
                          href={`/repo/${alert.repos.full_name}`}
                          className="flex items-start gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
                          onClick={() => setNotifOpen(false)}
                        >
                          <span className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground">{alert.repos.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">Drift score: {alert.drift_score}/100</p>
                          </div>
                        </a>
                      ))
                    )}
                    <div className="px-3 pt-1 pb-1 border-t border-white/8 mt-1">
                      <a href="/dashboard" className="text-[11px] text-blue-400 hover:text-blue-300" onClick={() => setNotifOpen(false)}>
                        View all in dashboard →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            <ThemeToggle />

            {status === "loading" ? (
              <div className="h-8 w-28 rounded-full bg-white/5 animate-pulse" />
            ) : session?.user ? (
              /* ── Logged-in state ── */
              <div className="hidden md:flex items-center gap-2">
                {/* Dashboard CTA – very prominent */}
                <a
                  href="/dashboard"
                  id="nav-dashboard-btn"
                  className="shimmer-btn flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-[1.03]"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </a>

                {/* Avatar / user menu */}
                <div className="relative" data-user-menu>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/8 transition-all"
                  >
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        width={26}
                        height={26}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="h-[26px] w-[26px] rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {session.user.name?.[0] ?? "U"}
                      </div>
                    )}
                    <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-10 w-52 glass-card rounded-xl py-1.5 shadow-xl shadow-black/40 border-white/10 z-50">
                      <div className="px-3 py-2 border-b border-white/8 mb-1">
                        <p className="text-xs font-semibold text-foreground truncate">{session.user.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{session.user.email}</p>
                      </div>
                      <a
                        href="/dashboard"
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-white/5 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 text-blue-400" />
                        Dashboard
                      </a>
                      <a
                        href="/settings"
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-white/5 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-3.5 w-3.5 text-purple-400" />
                        Settings
                      </a>
                      <button
                        onClick={() => { signOut(); setUserMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── Logged-out state ── */
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => signIn("github")}
                  className="px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </button>
                <button
                  id="nav-cta-btn"
                  onClick={() => signIn("github")}
                  className="shimmer-btn flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-[1.03]"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Start for Free
                </button>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Menu ── */}
        {mobileOpen && (
          <div className="md:hidden glass-nav border-t border-white/8 px-4 py-5 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
                {link.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-400">
                    {link.badge}
                  </span>
                )}
              </a>
            ))}

            <div className="my-1 h-px bg-white/8" />

            {session?.user ? (
              <>
                <a
                  href="/dashboard"
                  className="flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 px-3 rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Go to Dashboard
                </a>
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="flex items-center gap-2 text-sm text-muted-foreground py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn("github")}
                className="shimmer-btn flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 px-3 rounded-lg w-full mt-1"
              >
                <Zap className="h-4 w-4" />
                Start for Free
              </button>
            )}
          </div>
        )}
      </header>

      {/* Spacer so content doesn't hide behind fixed nav */}
      <div className="h-[62px]" />
    </>
  );
}
