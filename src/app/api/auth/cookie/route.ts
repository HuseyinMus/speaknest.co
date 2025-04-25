import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Güvenlik anahtarı - idealde bu bir çevre değişkeni olmalı
const SECRET_KEY = process.env.COOKIE_SECRET_KEY || 'default-secret-key-change-in-production';

// Değeri imzalamak için yardımcı fonksiyon
function signValue(value: string): string {
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(value);
  const signature = hmac.digest('base64');
  return `${value}.${signature}`;
}

// İmzanın doğruluğunu kontrol etmek için yardımcı fonksiyon
function verifySignature(signedValue: string): string | null {
  const [value, signature] = signedValue.split('.');
  
  if (!value || !signature) {
    return null;
  }
  
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(value);
  const expectedSignature = hmac.digest('base64');
  
  if (signature !== expectedSignature) {
    return null;
  }
  
  return value;
}

// Kimlik doğrulama için cookie oluşturma
export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    
    if (!userData || !userData.uid || !userData.role) {
      return NextResponse.json(
        { error: 'Geçersiz kullanıcı verisi' },
        { status: 400 }
      );
    }
    
    // Cookie ayarları
    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true, // JavaScript erişimini engeller
      sameSite: 'strict' as 'strict', // Daha güçlü CSRF koruması
      maxAge: 60 * 60 * 24 * 7, // 7 gün
      path: '/'
    };
    
    // Kullanıcı verisini hazırla ve Base64 ile kodla
    const userDataString = JSON.stringify({
      uid: userData.uid,
      role: userData.role
    });
    const encodedData = Buffer.from(userDataString).toString('base64');
    
    // İmzalı veri oluştur
    const signedValue = signValue(encodedData);
    
    // Cookie'yi ayarla
    cookies().set('auth', signedValue, cookieOptions);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cookie oluşturma hatası:', error);
    return NextResponse.json(
      { error: 'Kimlik bilgileri kaydedilemedi' },
      { status: 500 }
    );
  }
}

// Kimlik doğrulama cookie'sini silme
export async function DELETE() {
  try {
    // Cookie'yi sil
    cookies().delete('auth');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cookie silme hatası:', error);
    return NextResponse.json(
      { error: 'Kimlik bilgileri silinemedi' },
      { status: 500 }
    );
  }
} 