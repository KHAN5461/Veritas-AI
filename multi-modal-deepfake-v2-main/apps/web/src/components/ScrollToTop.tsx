'use client';
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.scrollTop > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
      return () => mainElement.removeEventListener('scroll', handleScroll);
    } else {
      // Fallback for window scroll
      const handleWindowScroll = () => {
        if (window.scrollY > 400) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      };
      window.addEventListener('scroll', handleWindowScroll);
      return () => window.removeEventListener('scroll', handleWindowScroll);
    }
  }, []);

  const scrollToTop = () => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-40 md:bottom-8 md:right-8 w-12 h-12 bg-surface-container-highest border border-outline-variant rounded-full shadow-lg flex items-center justify-center text-on-surface hover:bg-surface-container-highest/80 transition-colors"
          title="Scroll to Top"
        >
          <span className="material-symbols-outlined">keyboard_double_arrow_up</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
