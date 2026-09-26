'use client';
import type { Metadata } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import "./globals.css";
import { Toaster, toast } from "sonner";
import { IconButton } from "@repo/ui";
import { motion } from "framer-motion";
import { ScrollToTop } from "../components/ScrollToTop";
import { InstallBanner } from "../components/InstallBanner";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";

const NAV_ITEMS = [
  { href: "/", icon: "dashboard", label: "Dashboard" },
  { href: "/analyze", icon: "troubleshoot", label: "Analyze" },
  { href: "/history", icon: "history", label: "History" },
  { href: "/threat-intel", icon: "radar", label: "Threats" },
  { href: "/api-hub", icon: "api", label: "API Hub" },
];

function GlobalDropzoneOverlay() {
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let dragCounter = 0;

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) setIsDragging(false);
    };

    const onDragOver = (e: DragEvent) => e.preventDefault();

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        toast.success("File captured. Redirecting to analysis...");
        router.push("/analyze");
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [router]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-surface/80 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-primary pointer-events-none transition-all">
      <div className="w-24 h-24 rounded-3xl bg-primary-container flex items-center justify-center mb-6 animate-bounce">
        <span className="material-symbols-outlined text-[48px] text-on-primary-container">upload_file</span>
      </div>
      <h2 className="text-4xl font-bold text-on-surface tracking-tight mb-2">Drop to Analyze</h2>
      <p className="text-lg text-on-surface-variant">Release your file anywhere to scan it instantly</p>
    </div>
  );
}

function NavRail() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-20 hover:w-64 transition-all duration-300 ease-in-out bg-surface-container flex-col items-center hover:items-start h-full shrink-0 py-3 gap-1 z-50 group border-r border-outline-variant/20 shadow-xl overflow-hidden relative">
        {/* Logo */}
        <div className="w-full h-16 relative flex items-center justify-center group-hover:justify-start group-hover:px-5 mb-4 mt-2 transition-all duration-300 ease-in-out">
          <img src="/logo.png" className="w-10 h-10 object-contain shrink-0 drop-shadow-md" alt="Veritas Logo" />
          <span className="absolute left-[76px] font-bold text-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-on-surface tracking-tight pointer-events-none">
            Veritas AI
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col gap-1 items-center group-hover:items-start w-full px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={
                  "relative flex items-center gap-4 w-full h-12 rounded-full px-3 transition-colors active:scale-95 " +
                  (isActive ? "bg-secondary-container" : "hover:bg-on-surface/8")
                }
              >
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={"material-symbols-outlined text-[24px] shrink-0 " + (isActive ? "text-on-secondary-container" : "text-on-surface-variant")}>
                  {item.icon}
                </span>
                <span className={"font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap " + (isActive ? "text-on-surface" : "text-on-surface-variant")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: avatar + settings */}
        <div className="w-full px-3 mb-2 flex flex-col gap-1">
          {/* User avatar row */}
          <button
            onClick={() => router.push("/settings")}
            title="Profile & Settings"
            className="flex items-center gap-4 w-full h-12 rounded-full px-3 transition-colors active:scale-95 hover:bg-on-surface/8"
          >
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm shrink-0 overflow-hidden border-2 border-transparent hover:border-primary transition-all">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.email?.[0]?.toUpperCase() || "U"
              )}
            </div>
            <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-on-surface-variant text-sm truncate pr-2">
              {user?.displayName || user?.email || "Profile"}
            </span>
          </button>

          {/* Settings link */}
          <Link
            href="/settings"
            title="Settings"
            className={
              "relative flex items-center gap-4 w-full h-12 rounded-full px-3 transition-colors active:scale-95 " +
              (pathname === "/settings" ? "bg-secondary-container" : "hover:bg-on-surface/8")
            }
          >
            {pathname === "/settings" && (
              <motion.div
                layoutId="navIndicator"
                className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={"material-symbols-outlined text-[24px] shrink-0 " + (pathname === "/settings" ? "text-on-secondary-container" : "text-on-surface-variant")}>
              settings
            </span>
            <span className={"font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap " + (pathname === "/settings" ? "text-on-surface" : "text-on-surface-variant")}>
              Settings
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile bottom dock */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 h-16 bg-surface-container-highest/90 backdrop-blur-xl rounded-2xl flex items-center justify-around z-50 shadow-2xl shadow-black/50 px-1 border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
        {[
          { href: "/", icon: "dashboard", label: "Home" },
          { href: "/analyze", icon: "troubleshoot", label: "Analyze" },
          { href: "/history", icon: "history", label: "History" },
          { href: "/threat-intel", icon: "radar", label: "Threats" },
          { href: "/api-hub", icon: "api", label: "API Hub" },
        ].map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center h-full flex-1 active:scale-95 transition-transform"
            >
              <div className={"w-10 h-7 rounded-full flex items-center justify-center mb-0.5 transition-all " + (isActive ? "bg-secondary-container shadow-sm" : "")}>
                <span className={"material-symbols-outlined text-[20px] " + (isActive ? "text-on-secondary-container" : "text-on-surface-variant")}>
                  {item.icon}
                </span>
              </div>
              <span className={"text-[9px] font-semibold tracking-tight " + (isActive ? "text-primary" : "text-on-surface-variant")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function TopAppBar() {
  const [isDark, setIsDark] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.replace("dark", "light");
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.classList.replace(isDark ? "dark" : "light", next);
    localStorage.setItem("theme", next);
    setIsDark(!isDark);
  };

  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-14 bg-surface flex items-center px-3 md:px-6 justify-between shrink-0 border-b border-outline-variant/10 relative z-30">
      <div className="flex items-center gap-2 overflow-hidden">
        {/* Mobile-only logo — small and clean */}
        <img
          src="/logo.png"
          className="w-6 h-6 object-contain shrink-0 md:hidden"
          alt="Veritas Logo"
        />
        {/* App name — visible on mobile, hidden on md (sidebar shows on md) */}
        <span className="text-base font-bold text-on-surface tracking-tight truncate md:hidden">
          Veritas AI
        </span>
        {/* Desktop subtitle */}
        <span className="text-sm text-on-surface-variant hidden md:inline truncate">
          Multimodal Deepfake Detection
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0 relative">
        <IconButton icon={isDark ? "light_mode" : "dark_mode"} onClick={toggleTheme} />
        
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-on-surface/8 text-on-surface-variant hover:text-on-surface transition-colors relative"
            title="Notifications & System Status"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400"></span>
          </button>

          {/* Notifications Popover */}
          {showNotifications && (
            <div className="absolute right-0 top-11 w-72 sm:w-80 bg-surface-container-high border border-outline-variant/40 rounded-2xl shadow-2xl p-4 text-xs z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-3">
                <span className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">notifications_active</span>
                  System Feed
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Online</span>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="p-2.5 rounded-xl bg-surface-container flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-emerald-400 text-[18px] shrink-0 mt-0.5">check_circle</span>
                  <div>
                    <p className="font-semibold text-on-surface">Detection Engine Active</p>
                    <p className="text-[11px] text-on-surface-variant">ViT & Audio models loaded and ready for multimodal verification.</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">security</span>
                  <div>
                    <p className="font-semibold text-on-surface">Threat Telemetry</p>
                    <p className="text-[11px] text-on-surface-variant">Global synthetic media signatures are up-to-date.</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
                <button onClick={() => { setShowNotifications(false); router.push('/threat-intel'); }} className="text-primary hover:underline font-semibold">
                  Threat Intel &rarr;
                </button>
                <button onClick={() => setShowNotifications(false)} className="text-on-surface-variant hover:text-on-surface">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => router.push("/settings")}
          className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm ml-1 overflow-hidden hover:opacity-90 transition-opacity cursor-pointer border-2 border-transparent hover:border-primary"
          title="Go to Profile"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            user?.email?.[0]?.toUpperCase() || "U"
          )}
        </button>
      </div>
    </header>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  if (loading) return null;
  if (!user && pathname !== "/login") return null;

  return <>{children}</>;
}

/** Global keyboard shortcut handler */
function KeyboardShortcuts() {
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only trigger on Ctrl (Windows/Linux) or Cmd (Mac)
      if (!e.ctrlKey && !e.metaKey) return;
      // Don't steal focus from inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key.toLowerCase()) {
        case "u":
          e.preventDefault();
          router.push("/analyze");
          break;
        case "b":
          e.preventDefault();
          router.push("/analyze?mode=batch");
          break;
        case "k":
          e.preventDefault();
          router.push("/history");
          break;
        default:
          break;
      }
    },
    [router]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return null;
}

function PwaInit() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js?v=8", { scope: "/", updateViaCache: "none" })
        .then((reg) => {
          console.log("[PwaInit] SW registered v8, scope:", reg.scope);
          reg.update();
        })
        .catch((err) => {
          console.error("[PwaInit] SW registration failed:", err);
        });
    }
  }, []);
  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#0f1419" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        suppressHydrationWarning
        className="bg-surface text-on-surface flex h-screen overflow-hidden font-[Inter,system-ui,sans-serif]"
      >
        <PwaInit />
        <AuthProvider>
          <AuthGuard>
            {isAuthPage ? (
              <main className="flex-1 w-full h-full overflow-y-auto">{children}</main>
            ) : (
              <>
                <GlobalDropzoneOverlay />
                <ScrollToTop />
                <KeyboardShortcuts />
                <NavRail />
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                  <TopAppBar />
                  <InstallBanner />
                  <main className="flex-1 overflow-y-auto bg-surface-container-lowest relative z-0 pb-32 md:pb-0">
                    {children}
                  </main>
                </div>
              </>
            )}
            <Toaster richColors position="top-right" />
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
