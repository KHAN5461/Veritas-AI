'use client';
import React, { useEffect } from 'react';
import { Card, Button } from '@repo/ui';
import { auth, googleProvider } from '../../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-surface text-on-surface overflow-x-hidden font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <img src="/logo.png" alt="Veritas AI Logo" className="h-8 w-8 object-contain" />
              <span className="font-bold text-xl tracking-tight text-primary">Veritas AI</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <button onClick={() => scrollTo('features')} className="text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">Features</button>
              <button onClick={() => scrollTo('how-it-works')} className="text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">How It Works</button>
              <button className="text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">Pricing</button>
            </div>
            <div>
              <Button variant="filled" onClick={() => scrollTo('get-started')} className="!rounded-full text-sm">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-[90vh] flex flex-col lg:flex-row items-center gap-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 text-center lg:text-left z-10"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Detect Deepfakes.<br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-tertiary">Protect Truth.</span>
            </h1>
            <p className="text-lg sm:text-xl text-on-surface-variant mb-8 max-w-2xl mx-auto lg:mx-0">
              AI-powered forensic analysis for images, videos, and audio. Trusted by researchers and journalists worldwide.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button variant="filled" onClick={() => scrollTo('get-started')} className="!h-12 !px-8 text-base !rounded-full w-full sm:w-auto">
                Start Free Analysis
              </Button>
              <Button variant="outlined" onClick={() => scrollTo('features')} className="!h-12 !px-8 text-base !rounded-full w-full sm:w-auto">
                See How It Works
              </Button>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 relative w-full h-[400px] lg:h-[500px]"
          >
            {/* Abstract visual */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 bg-primary/20 rounded-full blur-3xl absolute animate-pulse"></div>
              <div className="w-48 h-48 bg-secondary/20 rounded-full blur-2xl absolute translate-x-20 -translate-y-10"></div>
              
              <div className="relative z-10 w-full max-w-sm aspect-square bg-surface-variant/30 backdrop-blur-xl border border-outline-variant rounded-2xl p-6 shadow-2xl flex flex-col justify-between overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-tertiary"></div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl">troubleshoot</span>
                  <div className="h-2 w-24 bg-primary/30 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      animate={{ width: ['0%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                </div>
                
                <div className="space-y-4 flex-1">
                   <div className="flex gap-2">
                     <div className="w-8 h-8 rounded bg-surface/50"></div>
                     <div className="flex-1 h-8 rounded bg-surface/50"></div>
                   </div>
                   <div className="h-24 rounded bg-surface/30 w-full"></div>
                </div>
              </div>
            </div>

            {/* Floating Stats */}
            <motion.div 
              animate={{ y: [-10, 10, -10] }} 
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute top-10 right-0 lg:-right-10 bg-surface border border-outline-variant p-4 rounded-xl shadow-lg flex items-center gap-3 z-20"
            >
              <div className="bg-primary/10 p-2 rounded-full text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <div>
                <div className="font-bold leading-tight">10,000+</div>
                <div className="text-xs text-on-surface-variant">files analyzed</div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [10, -10, 10] }} 
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-20 left-0 lg:-left-10 bg-surface border border-outline-variant p-4 rounded-xl shadow-lg flex items-center gap-3 z-20"
            >
               <div className="bg-secondary/10 p-2 rounded-full text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <div>
                <div className="font-bold leading-tight">99.2%</div>
                <div className="text-xs text-on-surface-variant">accuracy</div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [-5, 5, -5] }} 
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-10 right-10 bg-surface border border-outline-variant p-3 rounded-xl shadow-lg flex items-center gap-2 z-20"
            >
               <div className="bg-tertiary/10 p-1.5 rounded-full text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">speed</span>
              </div>
              <div className="text-sm font-bold">&lt; 3s <span className="font-normal text-xs text-on-surface-variant">processing</span></div>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-surface-variant/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise-Grade Detection</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto text-lg">Comprehensive tools to identify synthetically generated or manipulated media across all formats.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Multi-Modal Analysis', desc: 'Analyze images, videos, and audio files', icon: 'troubleshoot' },
                { title: 'Batch Processing', desc: 'Process hundreds of files simultaneously', icon: 'queue' },
                { title: 'Forensic Reports', desc: 'Generate court-ready PDF reports', icon: 'assignment' },
                { title: 'Browser Extension', desc: 'Detect fakes while browsing the web', icon: 'extension' },
                { title: 'Developer API', desc: 'Integrate detection into your workflow', icon: 'api' },
                { title: 'Threat Intelligence', desc: 'Monitor global deepfake trends', icon: 'security' },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="h-full"
                >
                  <Card variant="outlined" className="h-full !p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-outline-variant hover:border-primary/50 group bg-surface">
                    <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <span className="material-symbols-outlined text-primary text-2xl">{feature.icon}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-on-surface-variant">{feature.desc}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto text-lg">Three simple steps to uncover the truth.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-12 relative max-w-5xl mx-auto">
              {/* Connecting line for desktop */}
              <div className="hidden lg:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-outline-variant z-0"></div>

              {[
                { step: '1', title: 'Upload', desc: 'Drag and drop any media file', icon: 'cloud_upload' },
                { step: '2', title: 'Analyze', desc: 'Our AI examines 50+ forensic signals', icon: 'psychology' },
                { step: '3', title: 'Report', desc: 'Get a detailed authenticity report', icon: 'summarize' },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="flex-1 relative z-10 flex flex-col items-center text-center group"
                >
                  <div className="w-24 h-24 rounded-full bg-surface border-4 border-surface shadow-lg flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform duration-300">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-tertiary opacity-20"></div>
                    <span className="material-symbols-outlined text-4xl text-primary relative z-10">{item.icon}</span>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-on-primary font-bold flex items-center justify-center text-sm shadow-md z-20">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-on-surface-variant max-w-[250px] mx-auto">{item.desc}</p>
                </motion.div>
              ))}
            </div>
           </div>
        </section>

        {/* Login/Signup Section */}
        <section id="get-started" className="py-24 bg-surface-variant/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-tertiary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-surface rounded-3xl shadow-2xl p-8 sm:p-12 border border-outline-variant text-center"
            >
               <h2 className="text-3xl md:text-4xl font-bold mb-4">Get Started Free</h2>
               <p className="text-on-surface-variant mb-8 max-w-lg mx-auto">
                 Join thousands of professionals already using Veritas AI to verify media authenticity.
               </p>

               <div className="max-w-md mx-auto">
                  <Button variant="filled" onClick={handleLogin} className="w-full !h-14 text-lg !rounded-full mb-6">
                    <span className="material-symbols-outlined mr-2">login</span>
                    Continue with Google
                  </Button>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-on-surface-variant font-medium">
                    <div className="flex items-center gap-1">
                      🔒 End-to-end encrypted
                    </div>
                    <div className="hidden sm:block w-1.5 h-1.5 bg-outline rounded-full"></div>
                    <div className="flex items-center gap-1">
                      🚀 No credit card required
                    </div>
                  </div>
               </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-outline-variant py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Veritas Logo" className="w-8 h-8 object-contain drop-shadow-md" />
              <span className="font-bold text-xl text-primary">VERITAS AI</span>
            </div>
            
            <div className="flex gap-6 text-sm text-on-surface-variant">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
            
            <div className="text-sm text-on-surface-variant">
              © 2026 Veritas AI
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
