'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/context/LanguageContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Kurs interface'i
interface Course {
  id: string;
  title?: string;
  description?: string;
  instructorName?: string;
  level?: string;
  topic?: string;
}

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

export default function Dashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeCourses, setActiveCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Kullanıcı bilgilerini ve kursları yükle
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user) {
            setUserProfile(user.toJSON());
            await fetchActiveCourses();
          } else {
            router.push('/login');
          }
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (err) {
        console.error('Kullanıcı verisi yüklenirken hata:', err);
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [router]);
  
  // Aktif kursları getir
  const fetchActiveCourses = async () => {
    try {
      const coursesRef = collection(db, 'courses');
      const q = query(
        coursesRef,
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const courses: Course[] = [];
      
      querySnapshot.forEach((doc) => {
        courses.push({ 
          id: doc.id, 
          ...doc.data() 
        } as Course);
      });
      
      setActiveCourses(courses.slice(0, 2)); // Sadece 2 kurs göster
    } catch (error) {
      console.error('Kurslar yüklenirken hata:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Hoş geldin kartı */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md p-6 border border-blue-400">
        <h2 className="text-xl font-semibold text-white mb-2">{t('welcomeMessage', { name: userProfile?.displayName || userProfile?.firstName || t('student') })}</h2>
        <p className="text-white opacity-90">{t('todayMessage')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 rounded-md transition-colors text-sm font-medium shadow-sm">
            {t('findMeeting')}
          </button>
          <button className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 rounded-md transition-colors text-sm font-medium shadow-sm">
            {t('quickMatch')}
          </button>
        </div>
      </div>
      
      {/* Yaklaşan Konuşma Toplantıları */}
      <div className="bg-white rounded-lg shadow-md border border-blue-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-3">
          <h2 className="text-base font-medium text-white">{t('upcomingMeetings')}</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8 rounded-md bg-blue-50">
            <p className="text-blue-700">{t('noUpcomingMeetings')}</p>
            <button 
              className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-md hover:from-indigo-700 hover:to-blue-600 transition-colors text-sm shadow-sm"
              onClick={() => router.push('/student-panel/sessions')}
            >
              {t('findConversationMeeting')}
            </button>
          </div>
          
          <div className="mt-4 text-right">
            <button 
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
              onClick={() => router.push('/student-panel/upcoming')}
            >
              {t('viewAllUpcomingPractices')} →
            </button>
          </div>
        </div>
      </div>
      
      {/* Pratik Odaları */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-600 px-6 py-3">
          <h2 className="text-base font-medium text-white">{t('popularPracticeRooms')}</h2>
        </div>
        <div className="p-6">
          {activeCourses.length > 0 ? (
            <div className="grid gap-4">
              {activeCourses.map((course) => (
                <div key={course.id} className="border border-slate-200 rounded-md p-4 hover:bg-slate-50 transition-colors">
                  <h3 className="text-lg font-medium text-slate-800">{course.title}</h3>
                  <p className="text-slate-600 text-sm mt-1">{course.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      {t('host')}: {course.instructorName || t('notSpecified')}
                    </span>
                    <button 
                      className="text-sm px-3 py-1.5 rounded-md bg-slate-700 text-white hover:bg-slate-800 transition-colors"
                      onClick={() => router.push(`/courses/${course.id}`)}
                    >
                      {t('joinRoom')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 rounded-md bg-slate-50">
              <p className="text-slate-500">{t('noPracticeRooms')}</p>
            </div>
          )}
          
          <div className="mt-4 text-right">
            <button 
              className="text-slate-700 hover:text-slate-900 text-sm font-medium transition-colors"
              onClick={() => router.push('/student-panel/practice-rooms')}
            >
              {t('viewAllPracticeRooms')} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 