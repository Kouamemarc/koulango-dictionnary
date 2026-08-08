/** Préférence de thème choisie manuellement, persistée au navigateur.
 * `null` = pas encore de choix explicite, on suit l'apparence système. */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

interface ThemePreferenceState {
  mode: ThemeMode | null;
  toggle: (systemIsDark: boolean) => void;
}

export const useThemePreference = create<ThemePreferenceState>()(
  persist(
    (set, get) => ({
      mode: null,
      toggle: (systemIsDark) =>
        set(() => {
          const current = get().mode ?? (systemIsDark ? "dark" : "light");
          return { mode: current === "dark" ? "light" : "dark" };
        }),
    }),
    { name: "koulango.theme-preference", storage: createJSONStorage(() => localStorage) }
  )
);
