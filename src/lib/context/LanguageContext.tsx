'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase/config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { translateKey, TranslationKey } from '@/lib/translations';
import { translations } from '../translations';
import { getUserFromDatabase } from '@/lib/firebase/auth';

// Desteklenen dillerin tanımlaması
export type Language = 'tr' | 'en' | 'es' | 'ar' | 'de';

// Dil nesnesi tip tanımı
export interface LanguageOption {
  code: string;
  name: string;
}

// Dil bağlamı için tip tanımı
export interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
  // LanguageSwitcher için gerekli özellikler
  currentLanguage: Language;
  changeLanguage: (language: Language) => void;
  languages: LanguageOption[];
}

// Tüm desteklenen diller
const languageOptions: LanguageOption[] = [
  { code: 'tr', name: 'Türkçe' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'ar', name: 'العربية' },
  { code: 'de', name: 'Deutsch' }
];

// Varsayılan değerler ile bağlam oluşturma
const LanguageContext = createContext<LanguageContextType>({
  language: 'tr',
  setLanguage: () => {},
  t: () => '',
  currentLanguage: 'tr',
  changeLanguage: () => {},
  languages: languageOptions
});

// Hook kullanımı için dışa aktarma
export const useLanguage = () => useContext(LanguageContext);

// Props tipi tanımı
interface LanguageProviderProps {
  children: ReactNode;
}

// Dil sağlayıcı bileşeni
export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Kullanıcı tarayıcısı dil tercihini veya yerel depolamadaki tercihi alarak başlangıç dilini belirleme
  const getInitialLanguage = (): Language => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language;
      if (savedLanguage && ['tr', 'en', 'es', 'ar', 'de'].includes(savedLanguage)) {
        return savedLanguage;
      }
      
      // Tarayıcı dilini kontrol et
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'tr') return 'tr';
      if (browserLang === 'es') return 'es';
      if (browserLang === 'ar') return 'ar';
      if (browserLang === 'de') return 'de';
    }
    return 'en'; // Varsayılan olarak İngilizce
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage());

  // Dil değişikliğini yerel depolamaya kaydetme
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', newLanguage);
    }
  };

  // LanguageSwitcher bileşeni için alias - aynı işlevi yapar
  const changeLanguage = setLanguage;

  // Çeviri fonksiyonu - parametre değişikliği desteği ile
  const t = (key: TranslationKey, params?: Record<string, string>) => {
    let text = translations[language][key] || translations.en[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
      });
    }
    
    return text;
  };

  // Kullanıcı oturum açtığında tercih edilen dilini getirme
  useEffect(() => {
    const checkUserLanguage = async () => {
      try {
        const user = await getUserFromDatabase();
        if (user && user.preferredLanguage) {
          setLanguage(user.preferredLanguage as Language);
        }
      } catch (error) {
        console.error('Kullanıcı dil tercihi kontrol edilirken hata oluştu:', error);
      }
    };

    checkUserLanguage();
  }, []);

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t,
      currentLanguage: language,
      changeLanguage,
      languages: languageOptions
    }}>
      {children}
    </LanguageContext.Provider>
  );
}; 