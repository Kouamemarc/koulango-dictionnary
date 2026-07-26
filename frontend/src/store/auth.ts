/** Store Zustand : session utilisateur et jetons. */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

import { AuthApi } from "@/api/endpoints";
import { ACCESS_KEY, REFRESH_KEY } from "@/api/client";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  /** Restaure la session au démarrage si un token est présent. */
  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_KEY);
      if (token) {
        const user = await AuthApi.me();
        set({ user });
      }
    } catch {
      await SecureStore.deleteItemAsync(ACCESS_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const tokens = await AuthApi.login({ email, password });
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.access_token);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token);
    const user = await AuthApi.me();
    set({ user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ user: null });
  },
}));
