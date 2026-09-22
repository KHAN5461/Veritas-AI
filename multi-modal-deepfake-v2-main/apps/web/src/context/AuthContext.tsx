'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'VERITAS_AUTH_STATE', uid: usr?.uid || null }, '*');
      }
    });

    const handleMessage = async (e: MessageEvent) => {
      if (e.data.type === 'VERITAS_SAVE_SCAN') {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const { saveScanResult } = await import('../lib/scans');
          const p = e.data.payload;
          await saveScanResult(currentUser.uid, p.fileData, p.result, p.hash || "ext-scan");
        }
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
