import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { UserRole, PagePermissions } from '@/lib/auth/rbac';

// Giriş yapmadan erişilebilecek sayfalar
const publicPages = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/privacy-policy',
  '/terms-of-service',
  '/about',
  '/contact',
];

// Path'i normalize et
function normalizePath(path: string): string {
  // URL parametrelerini temizle
  const cleanPath = path.split('?')[0].split('#')[0];
  
  // Sondaki slash'ı kaldır
  return cleanPath.endsWith('/') && cleanPath !== '/' 
    ? cleanPath.slice(0, -1) 
    : cleanPath;
}

// Kullanıcının sayfaya erişim izni var mı kontrol et
function hasAccess(path: string, userRole: string | null): boolean {
  const normalizedPath = normalizePath(path);
  
  // En spesifik path'i bul
  const matchingPaths = Object.keys(PagePermissions)
    .filter(permPath => normalizedPath.startsWith(permPath))
    .sort((a, b) => b.length - a.length); // En uzun (spesifik) path'i önce al
  
  // Path için bir izin tanımı yoksa, varsayılan olarak erişime izin ver
  if (matchingPaths.length === 0) return true;
  
  // En spesifik path için izinleri kontrol et
  const bestMatchPath = matchingPaths[0];
  const allowedRoles = PagePermissions[bestMatchPath as keyof typeof PagePermissions];
  
  // Rol tanımlı değilse erişimi reddet
  if (!userRole) return false;
  
  // Kullanıcı rolünün erişim izni var mı kontrol et
  return allowedRoles.includes(userRole as UserRole);
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const normalizedPath = normalizePath(path);
  
  // Public sayfalar için doğrudan erişime izin ver
  if (publicPages.some(page => normalizedPath === page || normalizedPath.startsWith(`${page}/`))) {
    return NextResponse.next();
  }

  // Auth cookie'sini kontrol et
  const authCookie = request.cookies.get('auth');
  const userRole = authCookie ? JSON.parse(decodeURIComponent(authCookie.value)).role : null;

  // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
  if (!authCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', encodeURIComponent(request.url));
    return NextResponse.redirect(loginUrl);
  }

  // Kullanıcı rolünü kontrol et
  if (!hasAccess(normalizedPath, userRole)) {
    // Erişim reddedildi sayfasına yönlendir
    return NextResponse.redirect(new URL('/access-denied', request.url));
  }

  // Her şey yolundaysa devam et
  return NextResponse.next();
}

// Middleware'in hangi path'lerde çalışacağını belirle
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}; 