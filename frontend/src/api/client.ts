/** Client axios avec injection du token JWT et rafraîchissement automatique. */
import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ?? "http://localhost:8000/api/v1";

export const ACCESS_KEY = "koulango.access";
export const REFRESH_KEY = "koulango.refresh";

export const api = axios.create({ baseURL: API_URL, timeout: 10000 });

// Injecte le token d'accès dans chaque requête
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Rafraîchit le token en cas de 401 (une seule tentative)
let refreshing = false;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !refreshing) {
      original._retry = true;
      refreshing = true;
      try {
        const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
        if (refresh) {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refresh,
          });
          await SecureStore.setItemAsync(ACCESS_KEY, data.access_token);
          await SecureStore.setItemAsync(REFRESH_KEY, data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        }
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
