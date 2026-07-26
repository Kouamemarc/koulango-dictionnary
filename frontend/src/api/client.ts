/** Client axios de l'app (aucune authentification : usage 100% anonyme). */
import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * En dev, "localhost" ne fonctionne pas depuis un émulateur/téléphone Android
 * (il pointe vers l'appareil lui-même) : on dérive donc l'IP du PC depuis l'hôte
 * utilisé par Expo pour servir le bundle (hostUri), avec repli sur 10.0.2.2
 * (alias émulateur). En production (__DEV__ === false), on utilise directement
 * l'URL configurée (API déployée sur Render).
 */
function resolveApiUrl(): string {
  const configured = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (!__DEV__) return configured ?? "http://localhost:8000/api/v1";
  if (Platform.OS === "web") return "http://localhost:8000/api/v1";

  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:8000/api/v1`;

  return Platform.OS === "android" ? "http://10.0.2.2:8000/api/v1" : "http://localhost:8000/api/v1";
}

const API_URL = resolveApiUrl();

// Render (plan gratuit) met le service en veille après inactivité : le réveil
// du conteneur peut prendre 30-40s, d'où un timeout généreux plutôt que 10s.
export const api = axios.create({ baseURL: API_URL, timeout: 45000 });
