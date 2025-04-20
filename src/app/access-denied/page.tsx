'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { AlertTriangle, Home, LogOut } from 'lucide-react';
import { useLanguage } from '@/lib/context/LanguageContext';

export default function AccessDeniedPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  useEffect(() => {
    // Mevcut kullanıcının email bilgisini al
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserEmail(user.email);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-md p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex-shrink-0">
            <AlertTriangle size={40} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-red-600">Erişim Reddedildi</h1>
            <p className="text-slate-600">{userEmail || 'Hesabınızın'} bu sayfaya erişim yetkisi yok.</p>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-100 rounded-md p-4 mb-6">
          <p className="text-red-800">
            Bu sayfaya erişmek için gereken yetkilere sahip değilsiniz. Lütfen sistem yöneticinize başvurun veya farklı bir hesapla giriş yapın.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center justify-center py-2 px-4 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
          >
            <Home size={18} className="mr-2" />
            Ana Sayfaya Dön
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <LogOut size={18} className="mr-2" />
            Çıkış Yap
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Eğer bu bir hata olduğunu düşünüyorsanız, lütfen <a href="mailto:destek@speaknest.com" className="text-blue-600 hover:underline">destek ekibimizle</a> iletişime geçin.
          </p>
        </div>
      </div>
    </div>
  );
} 