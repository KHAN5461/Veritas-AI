'use client';
import type { Metadata } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import "./globals.css";
import { Toaster, toast } from "sonner";
import { IconButton, Banner } from "@repo/ui";
import { motion } from "framer-motion";
import { ScrollToTop } from "../components/ScrollToTop";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";

const NAV_ITEMS = [
  { href: "/", icon: "dashboard", label: "Dashboard" },
  { href: "/analyze", icon: "troubleshoot", label: "Analyze" },
  { href: "/history", icon: "history", label: "History" },
  { href: "/batch", icon: "queue", label: "Batch" },
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

function MobileInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isStandalone) return null;
  if (!deferredPrompt && !isIOS) return null;

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else if (isIOS) {
      toast('Tap the Share icon, then "Add to Home Screen" to install.', {
        icon: '📱',
        duration: 5000,
      });
    }
  };

  return (
    <div className="md:hidden flex-none w-full p-3 bg-primary-container text-on-primary-container flex items-center justify-between shadow-sm border-b border-outline/20 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex items-center gap-3 overflow-hidden">
        <img src="/logo.png" alt="App Icon" className="w-10 h-10 object-contain shrink-0 drop-shadow-sm" />
        <div className="flex flex-col justify-center">
          <p className="text-sm font-bold tracking-tight">Install Veritas AI</p>
          <p className="text-[11px] opacity-90 truncate">Scan media directly from other apps</p>
        </div>
      </div>
      <button onClick={handleInstall} className="shrink-0 bg-primary text-on-primary text-xs font-bold py-2 px-4 rounded-full shadow-sm hover:opacity-90 transition-opacity active:scale-95">
        {isIOS ? 'How to Install' : 'Install'}
      </button>
    </div>
  );
}

function NavRail() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <>
      <aside className="hidden md:flex w-20 hover:w-64 transition-all duration-300 ease-in-out bg-surface-container flex-col items-center hover:items-start h-full shrink-0 py-3 gap-1 z-50 group border-r border-outline-variant/20 shadow-xl overflow-hidden relative">
        <div className="w-full h-16 relative flex items-center justify-center group-hover:justify-start group-hover:px-5 mb-4 mt-2 transition-all duration-300 ease-in-out">
          <img src="/logo.png" className="w-10 h-10 object-contain shrink-0 drop-shadow-md scale-110" alt="Veritas Logo" />
          <span className="absolute left-[76px] font-bold text-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-on-surface tracking-tight pointer-events-none">Veritas AI</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2 items-center group-hover:items-start w-full px-3">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} title={item.label} className={"group/link relative flex items-center gap-4 w-full h-12 rounded-full px-3 transition-colors active:scale-95 " + (isActive ? "bg-secondary-container" : "hover:bg-on-surface/8")}>
                {isActive && <motion.div layoutId="navIndicator" className="absolute left-0 w-1 h-8 bg-primary rounded-r-full" />}
                <span className={"material-symbols-outlined text-[24px] shrink-0 " + (isActive ? "text-on-secondary-container" : "text-on-surface-variant")}>{item.icon}</span>
                <span className={"font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap " + (isActive ? "text-on-surface" : "text-on-surface-variant")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="w-full px-3 mb-2 flex flex-col gap-2">
          <button 
            onClick={() => router.push('/settings')} 
            className="flex items-center gap-4 w-full h-12 rounded-full px-3 transition-colors active:scale-95 hover:bg-on-surface/8 group/link"
            title="User Profile"
          >
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm shrink-0 overflow-hidden border-2 border-transparent hover:border-primary transition-all">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.email?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-on-surface-variant text-sm truncate pr-2">
              {user?.email || 'Profile'}
            </span>
          </button>

          <Link href="/settings" title="Settings" className={"group/link relative flex items-center gap-4 w-full h-12 rounded-full px-3 transition-colors active:scale-95 " + (pathname === "/settings" ? "bg-secondary-container" : "hover:bg-on-surface/8")}>
            {pathname === "/settings" && <motion.div layoutId="navIndicator" className="absolute left-0 w-1 h-8 bg-primary rounded-r-full" />}
            <span className={"material-symbols-outlined text-[24px] shrink-0 " + (pathname === "/settings" ? "text-on-secondary-container" : "text-on-surface-variant")}>settings</span>
            <span className={"font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap " + (pathname === "/settings" ? "text-on-surface" : "text-on-surface-variant")}>Settings</span>
          </Link>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-3 left-3 right-3 h-16 bg-surface-container-highest/90 backdrop-blur-xl rounded-2xl flex items-center justify-around z-50 shadow-2xl shadow-black/50 px-1 border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
        {[
          { href: "/", icon: "dashboard", label: "Home" },
          { href: "/analyze", icon: "troubleshoot", label: "Analyze" },
          { href: "/batch", icon: "queue", label: "Batch" },
          { href: "/history", icon: "history", label: "History" },
          { href: "/threat-intel", icon: "radar", label: "Threats" },
          { href: "/api-hub", icon: "api", label: "API" },
        ].map(item => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center h-full flex-1 active:scale-95 transition-transform">
              <div className={"w-10 h-7 rounded-full flex items-center justify-center mb-0.5 transition-all relative " + (isActive ? "bg-secondary-container shadow-sm" : "transparent")}>
                <span className={"material-symbols-outlined text-[20px] " + (isActive ? "text-on-secondary-container" : "text-on-surface-variant")}>{item.icon}</span>
              </div>
              <span className={"text-[9px] font-semibold tracking-tight " + (isActive ? "text-primary font-bold" : "text-on-surface-variant")}>{item.label}</span>
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

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <header className="h-16 bg-surface flex items-center px-4 md:px-6 justify-between shrink-0">
      <div className="flex items-center gap-2 overflow-hidden">
        <img src="/logo.png" className="w-8 h-8 md:w-14 md:h-14 object-contain md:hidden scale-110 shrink-0" alt="Veritas Logo" />
        <span className="text-lg font-semibold text-on-surface tracking-tight truncate hidden sm:inline md:hidden lg:inline">Veritas AI</span>
        <span className="text-sm text-on-surface-variant ml-2 hidden md:inline truncate">Multimodal Deepfake Detection</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <IconButton icon={isDark ? "light_mode" : "dark_mode"} onClick={toggleTheme} />
        
        <button 
          onClick={() => router.push('/settings')} 
          className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm ml-1 md:ml-2 overflow-hidden hover:opacity-90 transition-opacity cursor-pointer border-2 border-transparent hover:border-primary"
          title="Go to Profile"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            user?.email?.[0]?.toUpperCase() || 'U'
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
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) return null;
  if (!user && pathname !== '/login') return null;

  return <>{children}</>;
}

function PwaInit() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js?v=6', {
        scope: '/',
        updateViaCache: 'none'
      })
        .then(reg => {
          console.log('[PwaInit] SW registered, scope:', reg.scope);
          reg.update();
        })
        .catch(err => {
          console.error('[PwaInit] SW registration failed:', err);
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
  const isAuthPage = pathname === '/login';

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body suppressHydrationWarning className="bg-surface text-on-surface flex h-screen overflow-hidden font-[Inter,system-ui,sans-serif]">
        <PwaInit />
        <AuthProvider>
          <AuthGuard>
            {isAuthPage ? (
              <main className="flex-1 w-full h-full overflow-y-auto">
                {children}
              </main>
            ) : (
              <>
                <GlobalDropzoneOverlay />
                <ScrollToTop />
                <NavRail />
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                  <TopAppBar />
                  <MobileInstallPrompt />
                  <main className="flex-1 overflow-y-auto bg-surface-container-lowest relative z-0 pb-24 md:pb-0">
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
