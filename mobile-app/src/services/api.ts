const API_URL = 'http://localhost:5000/api';

export async function apiFetch(endpoint: string, token: string | null, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  return res.json();
}