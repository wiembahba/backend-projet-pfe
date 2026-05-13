import { Platform } from 'react-native';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://192.168.x.x:5000/api'; // ← bdel bel IP mte3ek

export async function apiFetch(endpoint: string, token: string | null, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  return res.json();
}

export const notificationApi = {
  getAll:      (token: string | null) => apiFetch('/notifications/mes-notifications', token),
  markRead:    (id: number, token: string | null) => apiFetch(`/notifications/${id}/lire`, token, { method: 'PUT' }),
  markAllRead: (token: string | null) => apiFetch('/notifications/lire-toutes', token, { method: 'PUT' }),
};