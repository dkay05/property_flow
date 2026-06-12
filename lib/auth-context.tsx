import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { router } from 'expo-router';
import { api, setToken, clearToken, getToken, setUnauthorizedHandler } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthMember {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: string;
  isActive: boolean;
  isBlocked: boolean;
  permissions: Record<string, boolean>;
}

interface AuthContextValue {
  member: AuthMember | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isOwner: () => boolean;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<AuthMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setMember(null);
      router.replace("/login");
    });
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getToken();
      if (!token) { setIsLoading(false); return; }
      const me = await api<AuthMember>("GET", "/api/auth/me");
      setMember(me);
    } catch {
      await clearToken();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(phone: string, password: string) {
    const result = await api<{ token: string; member: AuthMember }>("POST", "/api/auth/login", { phone, password }, { skipAuth: true });
    await setToken(result.token);
    setMember(result.member);
  }

  async function logout() {
    await clearToken();
    setMember(null);
    router.replace("/login");
  }

  function hasPermission(permission: string): boolean {
    if (!member) return false;
    if (member.role === "owner") return true;
    return !!(member.permissions as Record<string, boolean>)?.[permission];
  }

  function isOwner(): boolean {
    return member?.role === "owner";
  }

  async function refreshMember() {
    try {
      const me = await api<AuthMember>("GET", "/api/auth/me");
      setMember(me);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ member, isLoading, isAuthenticated: !!member, login, logout, hasPermission, isOwner, refreshMember }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
