import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

// Kullanıcı rollerini tanımlama
export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  EDITOR = 'editor',
  PRO_USER = 'proUser',
  STUDENT = 'student',
  GUEST = 'guest'
}

// İzinleri tanımlama
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE_USERS = 'manage_users'
}

// RBAC yapısı için kullanılacak rol-izin haritası
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [Permission.READ, Permission.WRITE, Permission.UPDATE, Permission.DELETE, Permission.MANAGE_USERS],
  [UserRole.TEACHER]: [Permission.READ, Permission.WRITE, Permission.UPDATE],
  [UserRole.EDITOR]: [Permission.READ, Permission.WRITE, Permission.UPDATE],
  [UserRole.PRO_USER]: [Permission.READ, Permission.WRITE],
  [UserRole.STUDENT]: [Permission.READ],
  [UserRole.GUEST]: [Permission.READ]
};

// OOP yaklaşımıyla RBAC servisini oluşturma
export class RBACService {
  private static instance: RBACService;
  
  private constructor() {}
  
  public static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }
  
  // Kullanıcının rolünü Firestore'dan alma
  public async getUserRole(user: User | null): Promise<UserRole> {
    if (!user) return UserRole.GUEST;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().role) {
        return userDoc.data().role as UserRole;
      }
      return UserRole.STUDENT; // Varsayılan rol artık STUDENT
    } catch (error) {
      console.error('Rol alınamadı:', error);
      return UserRole.GUEST;
    }
  }
  
  // Kullanıcının belirli bir izne sahip olup olmadığını kontrol etme
  public async hasPermission(user: User | null, permission: Permission): Promise<boolean> {
    const role = await this.getUserRole(user);
    return rolePermissions[role].includes(permission);
  }
  
  // Belirli bir rolün izinlerini alma
  public getPermissionsForRole(role: UserRole): Permission[] {
    return rolePermissions[role];
  }
  
  // Tüm rolleri alma
  public getAllRoles(): string[] {
    return Object.values(UserRole);
  }
  
  // Rol adından görüntüleme adı oluşturma
  public getRoleDisplayName(role: string): string {
    switch(role) {
      case UserRole.ADMIN: return 'Admin';
      case UserRole.TEACHER: return 'Öğretmen';
      case UserRole.EDITOR: return 'Editör';
      case UserRole.PRO_USER: return 'Pro Kullanıcı';
      case UserRole.STUDENT: return 'Öğrenci';
      case UserRole.GUEST: return 'Misafir';
      default: return role;
    }
  }
}

// Singleton instance'ı dışa aktarma
export const rbacService = RBACService.getInstance();

// Sayfa erişim izinleri
export const PagePermissions = {
  // Admin paneli
  '/dashboard': [UserRole.ADMIN],
  '/admin-panel': [UserRole.ADMIN],
  
  // Öğretmen paneli
  '/teacher-panel': [UserRole.ADMIN, UserRole.TEACHER],
  
  // Pro kullanıcı paneli
  '/prouser-panel': [UserRole.ADMIN, UserRole.PRO_USER],
  
  // Öğrenci paneli
  '/student-panel': [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PRO_USER],
  '/student-panel/dashboard': [UserRole.ADMIN, UserRole.STUDENT, UserRole.PRO_USER],
  '/student-panel/vocabulary': [UserRole.ADMIN, UserRole.STUDENT, UserRole.PRO_USER],
  '/student-panel/sessions': [UserRole.ADMIN, UserRole.STUDENT, UserRole.PRO_USER],
  '/student-panel/practice-rooms': [UserRole.ADMIN, UserRole.STUDENT, UserRole.PRO_USER],
  '/student-panel/upcoming': [UserRole.ADMIN, UserRole.STUDENT, UserRole.PRO_USER],
  '/student-panel/assignments': [UserRole.ADMIN, UserRole.STUDENT, UserRole.PRO_USER],
  '/student-panel/profile': [UserRole.ADMIN, UserRole.STUDENT, UserRole.PRO_USER],
  '/student-panel/statistics': [UserRole.ADMIN, UserRole.STUDENT, UserRole.PRO_USER],
  '/student-panel/settings': [UserRole.ADMIN, UserRole.STUDENT, UserRole.PRO_USER],
}

export class RoleBasedAccess {
  /**
   * Kullanıcının belirli bir sayfaya erişim izninin olup olmadığını kontrol eder
   */
  public static hasPageAccess(path: string, userRole: UserRole): boolean {
    const normalizedPath = this.normalizePath(path);
    
    // PagePermissions içinde tanımlı değilse herkes erişebilir
    if (!PagePermissions[normalizedPath]) {
      return true;
    }
    
    // Tanımlı bir izin varsa, kullanıcının rolünün o izinler arasında olup olmadığını kontrol et
    return PagePermissions[normalizedPath].includes(userRole);
  }
  
  /**
   * Yolu normalize eder (sonundaki / işaretini kaldırır)
   */
  private static normalizePath(path: string): string {
    return path.endsWith('/') ? path.slice(0, -1) : path;
  }
  
  /**
   * Kullanıcının rolünü Firestore'dan alma
   */
  public static async getUserRole(user: User | null): Promise<UserRole> {
    if (!user) return UserRole.GUEST;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().role) {
        return userDoc.data().role as UserRole;
      }
      return UserRole.STUDENT; // Varsayılan rol artık STUDENT
    } catch (error) {
      console.error('Rol alınamadı:', error);
      return UserRole.GUEST;
    }
  }
}

// Rol tabanlı erişim kontrolü için hook kullanımı örneği
export function useRoleBasedAccess() {
  return {
    checkAccess: (path: string, userRole: UserRole) => RoleBasedAccess.hasPageAccess(path, userRole),
    getUserRole: (user: User | null) => RoleBasedAccess.getUserRole(user),
  };
} 