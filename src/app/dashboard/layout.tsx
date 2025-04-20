'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { UserRole, RoleBasedAccess } from '@/lib/auth/rbac';
import { AlertTriangle } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const checkAuthAndRole = async () => {
      try {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user) {
            // Kullanıcının rolünü al
            const role = await RoleBasedAccess.getUserRole(user);
            setUserRole(role);
            
            // Admin rolü kontrolü
            if (role !== UserRole.ADMIN) {
              setAccessDenied(true);
            }
          } else {
            // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
            router.push('/login');
          }
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (err) {
        console.error('Auth kontrolü sırasında hata:', err);
        setError('Oturum kontrolü sırasında bir hata oluştu.');
        setLoading(false);
      }
    };
    
    checkAuthAndRole();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-md bg-white border border-red-200 rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle size={24} className="text-red-500" />
            <h2 className="text-lg font-medium text-red-700">Hata</h2>
          </div>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-md bg-white border border-red-200 rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle size={24} className="text-red-500" />
            <h2 className="text-lg font-medium text-red-700">Erişim Reddedildi</h2>
          </div>
          <p className="text-slate-600">Bu sayfaya erişim yetkiniz bulunmuyor. Sadece admin kullanıcılar erişebilir.</p>
          <div className="mt-4">
            <button 
              onClick={() => router.push('/')}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 