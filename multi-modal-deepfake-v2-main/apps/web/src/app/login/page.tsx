'use client';
import React, { useEffect } from 'react';
import { Card, Button } from '@repo/ui';
import { auth, googleProvider } from '../../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
      alert('Login failed. Please check your credentials and Firebase config.');
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface p-4">
      <Card variant="elevated" className="w-full max-w-md !p-8 flex flex-col gap-6 text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">VERITAS AI</h1>
          <p className="text-on-surface-variant">Sign in to access your multimodal deepfake detection workspace.</p>
        </div>
        
        <Button variant="filled" onClick={handleLogin} className="w-full !h-12 text-base">
          <span className="material-symbols-outlined mr-2">login</span>
          Sign in with Google
        </Button>
      </Card>
    </div>
  );
}
