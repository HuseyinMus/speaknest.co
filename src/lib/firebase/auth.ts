import { auth, db } from './config';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { deleteAuthCookie } from '@/lib/auth/setCookie';

// Kullanıcı tipi tanımı
export interface User {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: string;
  preferredLanguage?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
  provider?: string;
}

// Google Auth Provider oluşturma
const googleProvider = new GoogleAuthProvider();

// Google ile giriş yapma
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Kullanıcı Firestore'da var mı kontrol et
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    // Kullanıcı Firestore'da yoksa ekle
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'İsimsiz Kullanıcı',
        photoURL: user.photoURL,
        role: 'student', // Varsayılan rol
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'google'
      });
    } else {
      // Kullanıcı varsa login bilgilerini güncelle
      await setDoc(userRef, {
        updatedAt: new Date(),
        lastLogin: new Date()
      }, { merge: true });
    }
    
    return user;
  } catch (error) {
    console.error('Google ile giriş yapılırken hata oluştu:', error);
    throw error;
  }
};

// Giriş yapmış kullanıcı bilgilerini Firestore'dan getir
export const getUserFromDatabase = async (): Promise<User | null> => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return null;
    }
    
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { ...(userDoc.data() as User), uid: currentUser.uid };
    }
    
    return null;
  } catch (error) {
    console.error('Kullanıcı bilgileri alınırken hata oluştu:', error);
    throw error;
  }
};

/**
 * Giriş yapmış kullanıcının bilgilerini alır
 * @returns {Promise<{user: User | null, userData: any | null}>} Kullanıcı bilgileri ve Firestore'daki döküman verisi
 */
export const getCurrentUser = async () => {
  try {
    // Mevcut kimlik doğrulama oturumundan kullanıcıyı al
    const user = auth.currentUser;
    
    if (!user) {
      return { user: null, userData: null };
    }
    
    // Kullanıcı verilerini Firestore'dan al
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return { 
        user, 
        userData: userDoc.data() 
      };
    } else {
      console.error('Kullanıcı verileri Firestore\'da bulunamadı.');
      return { user, userData: null };
    }
  } catch (error) {
    console.error('Kullanıcı bilgileri alınırken hata oluştu:', error);
    throw error;
  }
};

/**
 * Kullanıcının çıkış yapmasını sağlar
 * @returns {Promise<void>}
 */
export const signOut = async () => {
  try {
    // Firebase auth oturumunu sonlandır
    await firebaseSignOut(auth);
    
    // Auth cookie'yi sil
    await deleteAuthCookie();
  } catch (error) {
    console.error('Çıkış yaparken hata oluştu:', error);
    throw error;
  }
}; 