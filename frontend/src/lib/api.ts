import axios from 'axios';

// Em dev, usa o proxy do Vite ("/api"). Em produção (Vercel), defina
// VITE_API_URL com a URL da API no Render, ex: https://fincontrol-api.onrender.com/api
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

const TOKEN_KEY = 'fincontrol_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      setToken(null);
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

/** Extrai a mensagem de erro amigável de uma falha de API. */
export function apiError(err: unknown, fallback = 'Algo deu errado'): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  return fallback;
}
