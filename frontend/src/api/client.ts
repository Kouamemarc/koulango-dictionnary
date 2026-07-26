/** Client axios avec injection du token JWT et rafraîchissement automatique. */
import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * "localhost" ne fonctionne pas depuis un émulateur/téléphone Android (il pointe
 * vers l'appareil lui-même). On dérive donc l'IP du PC depuis l'hôte utilisé par
 * Expo pour servir le bundle (hostUri), avec repli sur 10.0.2.2 (alias émulateur).
 */
function resolveApiUrl(): string {
  const configured = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (configured && !configured.includes("localhost")) return configured;
  if (Platform.OS === "web") return configured ?? "http://localhost:8000/api/v1";

  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:8000/api/v1`;

  return Platform.OS === "android" ? "http://10.0.2.2:8000/api/v1" : "http://localhost:8000/api/v1";
}

const API_URL = resolveApiUrl();

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
