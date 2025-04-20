'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '@/lib/context/LanguageContext';

export default function Header() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-green-600 to-green-800 text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-semibold">SpeakNest</Link>
            <div className="hidden md:flex space-x-6">
              <Link href="/about" className="hover:text-green-200 transition-colors">{t('about') || 'Hakkımızda'}</Link>
              <Link href="/pricing" className="hover:text-green-200 transition-colors">{t('pricing') || 'Fiyatlandırma'}</Link>
              <Link href="/contact" className="hover:text-green-200 transition-colors">{t('contact') || 'İletişim'}</Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher variant="select" className="mr-4" />
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm">
                  {t('hello') || 'Merhaba'}, {user.displayName || t('user') || 'Kullanıcı'}
                </span>
                <button
                  onClick={() => router.push('/profile')}
                  className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600 transition-colors"
                >
                  {t('profile') || 'Profilim'}
                </button>
                <button
                  onClick={() => auth.signOut()}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  {t('logout') || 'Çıkış Yap'}
                </button>
              </div>
            ) : (
              <div className="space-x-4">
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 bg-transparent border border-white text-white rounded hover:bg-white/10 transition-colors"
                >
                  {t('login')}
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="px-4 py-2 bg-white text-green-700 rounded hover:bg-green-50 transition-colors"
                >
                  {t('register')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 