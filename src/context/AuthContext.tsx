import React, { createContext, useContext, useState, useEffect } from 'react';
import { EmployeeUser, UserPermission, UserRole } from '../types';
import { dbService } from '../services/storage';
import { auth, loginWithGoogle as fbLoginWithGoogle, logoutUser as fbLogoutUser, onAuthStateChanged, User } from '../firebase';

interface AuthContextType {
  currentUser: EmployeeUser;
  permissions: UserPermission;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  switchUser: (userId: string) => void;
  login: (username: string, password?: string) => boolean;
  logout: () => Promise<void>;
  allUsers: EmployeeUser[];
  hasPermission: (perm: keyof UserPermission) => boolean;
  firebaseUser: User | null;
  loginWithGoogle: () => Promise<void>;
  isFirebaseLoading: boolean;
}

const rolePermissionsMap: Record<UserRole, UserPermission> = {
  Administrator: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: true,
    canDeleteOrReverse: true,
    canViewFinancials: true,
    canExportReports: true,
    canManageSettings: true,
  },
  Accounts: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: true,
    canDeleteOrReverse: false,
    canViewFinancials: true,
    canExportReports: true,
    canManageSettings: false,
  },
  'Site Manager': {
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: false,
    canDeleteOrReverse: false,
    canViewFinancials: false,
    canExportReports: true,
    canManageSettings: false,
  },
  'Data Entry Operator': {
    canView: true,
    canCreate: true,
    canEdit: false,
    canApprove: false,
    canDeleteOrReverse: false,
    canViewFinancials: false,
    canExportReports: false,
    canManageSettings: false,
  },
  'Read-Only User': {
    canView: true,
    canCreate: false,
    canEdit: false,
    canApprove: false,
    canDeleteOrReverse: false,
    canViewFinancials: false,
    canExportReports: true,
    canManageSettings: false,
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState(() => dbService.getDatabase());
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vishwas_is_authenticated') === 'true';
    }
    return false;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vishwas_active_user_id');
      if (saved) return saved;
    }
    return 'u-1'; // Default: Administrator
  });

  useEffect(() => {
    const unsub = dbService.subscribe(() => {
      setDb(dbService.getDatabase());
    });
    return unsub;
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsFirebaseLoading(false);

      if (user) {
        setIsAuthenticated(true);
        localStorage.setItem('vishwas_is_authenticated', 'true');

        // Check if user exists in db
        const existingUser = db.users.find(
          (u) => u.email.toLowerCase() === (user.email || '').toLowerCase()
        );
        if (existingUser) {
          setCurrentUserId(existingUser.id);
          localStorage.setItem('vishwas_active_user_id', existingUser.id);
        } else {
          // Provision or bind an admin account for owner (aniket.andeo35@gmail.com)
          const isOwner = user.email?.toLowerCase().includes('aniket');
          const googleUser: EmployeeUser = {
            id: `fb-${user.uid.substring(0, 8)}`,
            name: user.displayName || user.email || 'Cloud User',
            username: (user.email || 'user').split('@')[0],
            role: 'Administrator',
            mobile: user.phoneNumber || '+91 98220 54321',
            email: user.email || '',
            active: true,
            createdAt: new Date().toISOString().split('T')[0],
          };

          if (!db.users.some((u) => u.id === googleUser.id)) {
            const updated = {
              ...db,
              users: [googleUser, ...db.users],
            };
            dbService.saveDatabase(updated);
          }
          setCurrentUserId(googleUser.id);
          localStorage.setItem('vishwas_active_user_id', googleUser.id);
        }
      }
    });

    return () => unsubAuth();
  }, [db]);

  const currentUser = db.users.find((u) => u.id === currentUserId && u.active) || db.users[0];
  const permissions = rolePermissionsMap[currentUser.role] || rolePermissionsMap['Read-Only User'];

  const switchUser = (userId: string) => {
    const user = db.users.find((u) => u.id === userId);
    if (user && user.active) {
      setCurrentUserId(userId);
      localStorage.setItem('vishwas_active_user_id', userId);
      dbService.logAudit(
        user.name,
        'USER_SESSION_SWITCH',
        'Authentication',
        `Switched active login session to ${user.name} (${user.role})`
      );
    }
  };

  const login = (username: string, password?: string) => {
    const user = db.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim() && u.active
    );
    if (user) {
      if (user.password && password && user.password !== password) {
        return false;
      }
      setCurrentUserId(user.id);
      setIsAuthenticated(true);
      localStorage.setItem('vishwas_active_user_id', user.id);
      localStorage.setItem('vishwas_is_authenticated', 'true');
      dbService.logAudit(
        user.name,
        'USER_LOGIN_SUCCESS',
        'Authentication',
        `Logged in as ${user.name} (${user.role})`
      );
      return true;
    }
    return false;
  };

  const loginWithGoogle = async () => {
    try {
      const user = await fbLoginWithGoogle();
      setIsAuthenticated(true);
      localStorage.setItem('vishwas_is_authenticated', 'true');
      dbService.logAudit(
        user.displayName || user.email || 'Google User',
        'GOOGLE_AUTH_SIGNIN',
        'Authentication',
        `Google Cloud Login successful: ${user.email}`
      );
    } catch (err) {
      console.error('Google Sign-In caught:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fbLogoutUser();
    } catch (e) {
      console.warn('Firebase logout error:', e);
    }
    setIsAuthenticated(false);
    localStorage.removeItem('vishwas_is_authenticated');
    const readOnly = db.users.find((u) => u.role === 'Read-Only User') || db.users[0];
    setCurrentUserId(readOnly.id);
    localStorage.setItem('vishwas_active_user_id', readOnly.id);
  };

  const hasPermission = (perm: keyof UserPermission) => {
    return !!permissions[perm];
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        permissions,
        isAuthenticated,
        setIsAuthenticated,
        switchUser,
        login,
        logout,
        allUsers: db.users,
        hasPermission,
        firebaseUser,
        loginWithGoogle,
        isFirebaseLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
