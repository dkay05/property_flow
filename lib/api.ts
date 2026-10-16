import { fetch } from "expo/fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "@propertyflow_token";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) throw new Error("EXPO_PUBLIC_DOMAIN not set");
  if (/^https?:\/\//.test(domain)) return domain;
  const isLocal = /^(localhost|127\.0\.0\.1|10\.|192\.168\.)/.test(domain);
  return `${isLocal ? "http" : "https"}://${domain}`;
}

/** The API origin, also used to build public share links. */
export function getApiBaseUrl(): string {
  return getBaseUrl();
}

/**
 * Uploaded media is stored as a server-relative path ("/uploads/x.jpg") so it
 * survives a domain change. Image components need an absolute url, and remote
 * urls (YouTube thumbnails, pasted links) are passed through untouched.
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|file:|blob:)/.test(url)) return url;
  return `${getBaseUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
}

type UnauthorizedHandler = () => void;
let _unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  _unauthorizedHandler = handler;
}

export async function api<T = any>(
  method: string,
  path: string,
  data?: any,
  options?: { skipAuth?: boolean }
): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;
  const token = options?.skipAuth ? null : await getToken();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (res.status === 401 && !options?.skipAuth) {
    await clearToken();
    _unauthorizedHandler?.();
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    let message = errText;
    try { message = JSON.parse(errText).message || errText; } catch {}
    throw new Error(message || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const apiGet = <T>(path: string) => api<T>("GET", path);
export const apiPost = <T>(path: string, data?: any) => api<T>("POST", path, data);
export const apiPut = <T>(path: string, data?: any) => api<T>("PUT", path, data);
export const apiDelete = <T>(path: string) => api<T>("DELETE", path);
