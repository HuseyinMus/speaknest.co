import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Gerekli Firebase çevre değişkenlerini kontrol etme fonksiyonu
function validateFirebaseConfig() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(
    varName => !process.env[varName]
  );
  
  if (missingEnvVars.length > 0) {
    console.error(
      `Firebase yapılandırması eksik! Lütfen aşağıdaki çevre değişkenlerinin tanımlandığından emin olun:\n` +
      missingEnvVars.map(varName => `- ${varName}`).join('\n')
    );
    
    // Geliştirme ortamında sadece uyarı ver, üretimde hata fırlat
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Firebase yapılandırması eksik. Lütfen .env dosyasını kontrol edin.');
    }
  }
}

// Firebase yapılandırmasını doğrula
validateFirebaseConfig();

// Firebase yapılandırması - çevre değişkenlerinden alınıyor
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Firestore, Auth ve Storage servislerini başlat
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Ortam bilgisini kontrol et
export const isProduction = process.env.NODE_ENV === 'production';

// Firebase koleksiyon isimleri
export const collections = {
  users: isProduction ? 'users' : 'users_dev',
  meetings: isProduction ? 'meetings' : 'meetings_dev',
  wordGroups: isProduction ? 'wordGroups' : 'wordGroups_dev',
  // Diğer koleksiyonlar...
}; 