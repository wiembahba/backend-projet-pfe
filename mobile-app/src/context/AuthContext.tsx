import React, { createContext, useContext, useState } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
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

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://172.24.175.49:5000/api';

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
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u));
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; role?: UserRole }> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response:', text.slice(0, 200));
        return { success: false };
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error('Login failed:', data.message || `HTTP ${res.status}`);
        return { success: false };
      }

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

    } catch (err) {
      console.error('Login error:', err);
      return { success: false };
    }
  };

  const logout = async (): Promise<void> => {
    const currentToken = token;

    await storage.remove('mdw-token');
    await storage.remove('mdw-user');

    setUser(null);
    setToken(null);

    if (currentToken) {
      fetch(`${API_URL}/auth/logout`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${currentToken}`,
        },
      }).catch(() => {});
    }
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0f1e', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#185FA5" size="large" />
      </View>
    );
  }

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