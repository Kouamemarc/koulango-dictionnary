import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
const TOKEN_KEY = "koulango_admin_token";

// Render (plan gratuit) met le service en veille après inactivité : le réveil
// du conteneur peut prendre 30-40s, d'où un timeout généreux plutôt que la
// valeur par défaut d'axios.
export const api = axios.create({ baseURL: API_URL, timeout: 45000 });

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      if (location.pathname !== "/login") location.href = "/login";
    }
    return Promise.reject(error);
  }
);
