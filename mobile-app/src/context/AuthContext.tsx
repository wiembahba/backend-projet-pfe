import React, { createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'admin' | 'chef_projet' | 'employe';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isChef: boolean;
  isEmploye: boolean;
}

const API_URL = 'http://localhost:5000/api';

const storage = {
  get: (key: string): Promise<string | null> =>
    Platform.OS === 'web'
      ? Promise.resolve(localStorage.getItem(key))
      : AsyncStorage.getItem(key),

  set: (key: string, value: string): Promise<void> =>
    Platform.OS === 'web'
      ? (localStorage.setItem(key, value), Promise.resolve())
      : AsyncStorage.setItem(key, value),

  remove: (key: string): Promise<void> =>
    Platform.OS === 'web'
      ? (localStorage.removeItem(key), Promise.resolve())
      : AsyncStorage.removeItem(key),
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,  setUser]  = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const t = await storage.get('mdw-token');
        const u = await storage.get('mdw-user');
        if (t) setToken(t);
        if (u) setUser(JSON.parse(u));
      } catch {}
      setReady(true);
    })();
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; role?: UserRole }> => {
    try {
      const res  = await fetch(`${API_URL}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false };

      const loggedUser: AuthUser = {
        id:         String(data.user.id),
        name:       data.user.nom_complet,
        email:      data.user.email,
        role:       data.user.role as UserRole,
        department: data.user.departement ?? '',
      };

      await storage.set('mdw-token', data.token);
      await storage.set('mdw-user',  JSON.stringify(loggedUser));
      setToken(data.token);
      setUser(loggedUser);
      return { success: true, role: loggedUser.role };

    } catch {
      const MOCK_USERS: AuthUser[] = [
        { id: 'U0', name: 'Admin MDW',     email: 'admin@maisonweb.com',   role: 'admin',       department: 'Direction'     },
        { id: 'U1', name: 'Amine Belhadj', email: 'chef@maisonweb.com',    role: 'chef_projet', department: 'Développement' },
        { id: 'U2', name: 'Sara Mansouri', email: 'employe@maisonweb.com', role: 'employe',     department: 'Développement' },
      ];
      if (password !== 'password') return { success: false };
      const found = MOCK_USERS.find(u => u.email === email);
      if (!found) return { success: false };

      const mockToken = 'mock-token-' + found.role;
      await storage.set('mdw-token', mockToken);
      await storage.set('mdw-user',  JSON.stringify(found));
      setToken(mockToken);
      setUser(found);
      return { success: true, role: found.role };
    }
  };

  const logout = async (): Promise<void> => {
    const currentToken = token;

    // ✅ امسح الـ storage أولاً
    await storage.remove('mdw-token');
    await storage.remove('mdw-user');

    // ✅ بعدها امسح الـ state → navigator يبدل للـ AuthStack
    setUser(null);
    setToken(null);

    // ✅ بعث للـ backend في الخلفية
    if (currentToken && !currentToken.startsWith('mock-token')) {
      fetch(`${API_URL}/auth/logout`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${currentToken}`,
        },
      }).catch(() => {});
    }
  };

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAdmin:   user?.role === 'admin',
      isChef:    user?.role === 'chef_projet',
      isEmploye: user?.role === 'employe',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}