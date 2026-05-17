import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://192.168.1.XX:5000/api'; // ← bdel bel IP mte3ek

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
    this.data   = data;
  }
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

export async function apiFetch(
  endpoint: string,
  token:    string | null,
  options:  RequestInit = {},
): Promise<any> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // réponse non-JSON (ex: 204 No Content)
  }

  if (!res.ok) {
    const message = body?.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  return body;
}

// ─── Notification API ─────────────────────────────────────────────────────────

export const notificationApi = {
  getAll:      (token: string | null) =>
    apiFetch('/notifications/mes-notifications', token),

  markRead:    (id: number, token: string | null) =>
    apiFetch(`/notifications/${id}/lire`, token, { method: 'PUT' }),

  markAllRead: (token: string | null) =>
    apiFetch('/notifications/lire-toutes', token, { method: 'PUT' }),
};