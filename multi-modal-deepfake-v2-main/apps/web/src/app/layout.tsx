'use client';
import type { Metadata } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import "./globals.css";
import { Toaster, toast } from "sonner";
import { IconButton, Banner } from "@repo/ui";

const NAV_ITEMS = [
  { href: "/", icon: "dashboard", label: "Dashboard" },
  { href: "/analyze", icon: "troubleshoot", label: "Analyze" },
  { href: "/history", icon: "history", label: "History" },
  { href: "/batch", icon: "queue", label: "Batch" },
  { href: "/threat-intel", icon: "radar", label: "Threats" },
  { href: "/api-hub", icon: "api", label: "API Hub" },
];

function BackendHealthCheck() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('https://upside-shower-handling.ngrok-free.dev/health');
        if (!res.ok) throw new Error();
        setIsOffline(false);
      } catch (err) {
        setIsOffline(true);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!isOffline) return null;

  return (
    <div className="w-full shrink-0 animate-in slide-in-from-top-4 fade-in duration-300">
      <Banner 
        icon="wifi_off" 
        title="ML Backend Offline" 
        isError 
        actionLabel="Retry Connection" 
        onAction={() => window.location.reload()}
      >
        The FastAPI inference server is unreachable. Analysis features are currently disabled. Please run <code>python app.py</code> in the backend directory.
      </Banner>
    </div>
  );
}

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
        router.push('/analyze');
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
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

  return (
    <>
      <aside className="hidden md:flex w-20 bg-surface-container flex-col items-center h-full shrink-0 py-3 gap-1 z-50">
        <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-on-primary-container text-[28px]">shield</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1 items-center w-full">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 w-full py-1 group">
                <div className={"w-14 h-8 rounded-full flex items-center justify-center transition-colors " + (isActive ? "bg-secondary-container" : "group-hover:bg-on-surface/8")}>
                  <span className={"material-symbols-outlined text-[24px] " + (isActive ? "text-on-secondary-container" : "text-on-surface-variant")}>{item.icon}</span>
                </div>
                <span className={"text-[11px] font-medium " + (isActive ? "text-on-surface" : "text-on-surface-variant")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link href="/settings" className="flex flex-col items-center gap-0.5 mb-2 group w-full">
          <div className={"w-14 h-8 rounded-full flex items-center justify-center transition-colors " + (pathname === "/settings" ? "bg-secondary-container" : "group-hover:bg-on-surface/8")}>
            <span className={"material-symbols-outlined text-[24px] " + (pathname === "/settings" ? "text-on-secondary-container" : "text-on-surface-variant")}>settings</span>
          </div>
          <span className={"text-[11px] font-medium " + (pathname === "/settings" ? "text-on-surface" : "text-on-surface-variant")}>Settings</span>
        </Link>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container flex items-center justify-around z-50 border-t border-outline-variant/20 px-2 pb-safe">
        {[...NAV_ITEMS.slice(0, 4), { href: '/settings', icon: 'settings', label: 'Settings' }].map(item => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center h-full min-w-[64px]">
              <div className={"w-12 h-7 rounded-full flex items-center justify-center mb-1 transition-colors " + (isActive ? "bg-secondary-container" : "transparent")}>
                <span className={"material-symbols-outlined text-[22px] " + (isActive ? "text-on-secondary-container" : "text-on-surface-variant")}>{item.icon}</span>
              </div>
              <span className={"text-[10px] font-medium " + (isActive ? "text-on-surface" : "text-on-surface-variant")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function TopAppBar() {
  const [isDark, setIsDark] = useState(true);

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

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <header className="h-16 bg-surface flex items-center px-4 md:px-6 justify-between shrink-0">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary md:hidden text-[28px] mr-1">shield</span>
        <span className="text-lg font-semibold text-on-surface tracking-tight truncate">Veritas AI</span>
        <span className="text-sm text-on-surface-variant ml-2 hidden md:inline truncate">Multimodal Deepfake Detection</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <IconButton icon={isDark ? "light_mode" : "dark_mode"} onClick={toggleTheme} />
        <IconButton icon="logout" onClick={handleLogout} />
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm ml-1 md:ml-2">
          V
        </div>
      </div>
    </header>
  );
}

import { AuthProvider, useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) return null; // or a full-screen spinner
  if (!user && pathname !== '/login') return null;

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login';

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className="bg-surface text-on-surface flex h-screen overflow-hidden font-[Inter,system-ui,sans-serif]">
        <AuthProvider>
          <AuthGuard>
            {isAuthPage ? (
              <main className="flex-1 w-full h-full overflow-y-auto">
                {children}
              </main>
            ) : (
              <>
                <GlobalDropzoneOverlay />
                <NavRail />
                <div className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
                  <TopAppBar />
                  <BackendHealthCheck />
                  <main className="flex-1 overflow-y-auto bg-surface-container-lowest relative z-0">
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
