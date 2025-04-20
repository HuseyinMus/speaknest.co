'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Menu, X, Home, MessageCircle, Users, FileText, User, BarChart, Clock, Settings, LogOut, BookOpen, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/lib/context/LanguageContext';
import { RoleBasedAccess, UserRole, PagePermissions } from '@/lib/auth/rbac';

// Kullanıcı profili interface'i
interface UserProfile {
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  createdAt?: { seconds: number };
  englishLevel?: string;
  firstName?: string;
  lastName?: string;
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const router = useRouter();
  
  // Temel state'ler
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.STUDENT);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user) {
            // @ts-ignore: user.toJSON() metodu TypeScript'te tanımlı değil ama çalışıyor
            setUserProfile(user.toJSON ? user.toJSON() : user);
            
            // Kullanıcının rolünü al
            const role = await RoleBasedAccess.getUserRole(user);
            setUserRole(role);
            
            // Mevcut sayfaya erişim izni var mı kontrol et
            const path = window.location.pathname;
            const hasAccess = RoleBasedAccess.hasPageAccess(path, role);
            
            if (!hasAccess) {
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
    
    checkAuth();
  }, [router]);
  
  const handleLogout = async () => {
    try {
      // Önce tüm Firebase işlemlerini temizle
      window.speechSynthesis?.cancel(); // Varsa ses çalmayı durdur
      
      // Çıkış işlemini gerçekleştir
      await auth.signOut();
      
      // Sayfayı yönlendir
      window.location.href = '/login';
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  // Menü öğeleri - burada hem başlık hem de yönlendirme URL'lerini tanımlıyoruz
  const menuItems = [
    { id: 'dashboard', label: t('home'), icon: <Home size={18} />, url: '/student-panel/dashboard' },
    { id: 'sessions', label: t('conversationMeetings'), icon: <MessageCircle size={18} />, url: '/student-panel/sessions' },
    { id: 'practice-rooms', label: t('practiceRooms'), icon: <Users size={18} />, url: '/student-panel/practice-rooms' },
    { id: 'upcoming', label: t('upcomingPractices'), icon: <Clock size={18} />, url: '/student-panel/upcoming' },
    { id: 'assignments', label: t('assignments'), icon: <FileText size={18} />, url: '/student-panel/assignments' },
    { id: 'vocabulary', label: 'Kelime Öğren', icon: <BookOpen size={18} />, url: '/student-panel/vocabulary' },
    { id: 'profile', label: t('profile'), icon: <User size={18} />, url: '/student-panel/profile' },
    { id: 'statistics', label: t('statistics'), icon: <BarChart size={18} />, url: '/student-panel/statistics' },
    { id: 'settings', label: t('settings'), icon: <Settings size={18} />, url: '/student-panel/settings' },
  ];
  
  // Geçerli aktif sekmeyi yönlendirmeden belirleyin
  useEffect(() => {
    const path = window.location.pathname;
    const currentPath = path.split('/').pop() || 'dashboard';
    setActiveTab(currentPath);
  }, []);

  // Sadece kullanıcının erişim yetkisi olan menü öğelerini filtrele
  const filteredMenuItems = menuItems.filter(item => 
    RoleBasedAccess.hasPageAccess(item.url, userRole)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center p-8 rounded-lg bg-white shadow-sm">
          <div className="w-10 h-10 rounded-full border-2 border-t-slate-500 border-b-slate-300 border-l-transparent border-r-transparent animate-spin mb-4"></div>
          <div className="text-lg font-medium text-slate-700">Yükleniyor...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-slate-200 text-slate-700 px-6 py-5 rounded-lg max-w-md shadow-sm">
          <h2 className="text-lg font-semibold mb-3 text-red-600">Hata</h2>
          <p className="text-slate-600">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="mt-5 w-full py-2 px-4 rounded-md bg-slate-700 text-white font-medium hover:bg-slate-800 transition-colors"
          >
            Giriş Sayfasına Dön
          </button>
        </div>
      </div>
    );
  }
  
  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-slate-200 text-slate-700 px-6 py-5 rounded-lg max-w-md shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="text-red-500" size={24} />
            <h2 className="text-lg font-semibold text-red-600">Erişim Reddedildi</h2>
          </div>
          <p className="text-slate-600 mb-3">Bu sayfaya erişim yetkiniz bulunmuyor. Lütfen uygun yetkilere sahip bir hesapla giriş yapın veya ana sayfaya dönün.</p>
          <div className="flex space-x-3">
            <button 
              onClick={() => router.push('/')}
              className="mt-2 flex-1 py-2 px-4 rounded-md bg-slate-600 text-white font-medium hover:bg-slate-700 transition-colors"
            >
              Ana Sayfaya Dön
            </button>
            <button 
              onClick={handleLogout}
              className="mt-2 flex-1 py-2 px-4 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobil menü butonu */}
      <div className="bg-white p-4 flex justify-between items-center md:hidden border-b shadow-sm sticky top-0 z-50">
        <h1 className="text-lg font-semibold text-slate-800">{t('appName')}</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      
      {/* Sol yan çubuğu - mobil için modal, desktop için sabit */}
      <div className={`
        fixed inset-0 z-40 md:relative md:inset-auto
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
        flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm
      `}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {userProfile?.photoURL ? (
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-slate-200">
                <Image 
                  src={userProfile.photoURL} 
                  alt={userProfile.displayName || t('profile')} 
                  className="object-cover"
                  fill
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                {(userProfile?.displayName?.charAt(0) || userProfile?.firstName?.charAt(0) || 'S').toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-slate-800 truncate max-w-[150px]">
                {userProfile?.displayName || userProfile?.firstName || t('student')}
              </div>
              <div className="text-xs text-slate-500">{userProfile?.role || userRole}</div>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 md:hidden"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Menü öğeleri */}
        <div className="flex-1 overflow-y-auto p-3">
          <nav className="space-y-1">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  router.push(item.url);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center px-3 py-2 rounded-md text-sm
                  transition-colors
                  ${activeTab === item.id 
                    ? 'bg-slate-100 text-slate-800 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }
                `}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="p-3 border-t">
          <button
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
            className="w-full flex items-center px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            <span className="ml-3">Çıkış Yap</span>
          </button>
        </div>
      </div>
      
      {/* Ana içerik alanı - sayfalar buraya dynamik olarak yüklenecek */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        {children}
      </div>
    </div>
  );
} 