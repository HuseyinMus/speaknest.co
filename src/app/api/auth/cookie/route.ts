import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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
      sameSite: 'lax' as 'lax', // CSRF koruması
      maxAge: 60 * 60 * 24 * 7, // 7 gün
      path: '/'
    };
    
    // Auth cookie'si oluştur (kullanıcı rolü middleware'de kullanılacak)
    const authCookieValue = JSON.stringify({
      uid: userData.uid,
      role: userData.role
    });
    
    // Cookie'yi ayarla
    cookies().set('auth', authCookieValue, cookieOptions);
    
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