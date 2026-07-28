/** Palette et tokens de design — vert forêt / brun / crème (identité Koulango). */
import { useColorScheme } from "react-native";
import { useThemePreference } from "@/store/themePreference";

export const lightColors = {
  primary: "#1B6B3D",      // vert forêt
  primaryDark: "#124D2B",
  accent: "#8B4A1E",       // brun (bois, terre)
  bg: "#FBF1DC",           // crème
  surface: "#FFFFFF",
  text: "#241A10",
  textMuted: "#6B5D4D",
  border: "#EADFC4",
  danger: "#B91C1C",
  favorite: "#7B341E",     // cœur favoris (brun-rouge, cohérent avec l'accent)
  success: "#16A34A",
  warning: "#D97706",
};

export const darkColors: typeof lightColors = {
  primary: "#3FA96C",
  primaryDark: "#7FD9A4",  // plus clair que primary pour rester lisible sur fond sombre
  accent: "#D19A6A",
  bg: "#161310",           // brun très sombre au lieu de crème
  surface: "#211C16",
  text: "#F1E9DA",
  textMuted: "#B3A48F",
  border: "#3A322A",
  danger: "#F87171",
  favorite: "#E08A5C",
  success: "#4ADE80",
  warning: "#FBBF24",
};

export type ThemeColors = typeof lightColors;

/** Sombre ou clair : le choix explicite de l'utilisateur prime, sinon l'apparence système. */
export function useIsDark(): boolean {
  const scheme = useColorScheme();
  const override = useThemePreference((s) => s.mode);
  return override ? override === "dark" : scheme === "dark";
}

/** Couleurs actives selon le thème (choix utilisateur ou système), réactif aux changements. */
export function useThemeColors(): ThemeColors {
  return useIsDark() ? darkColors : lightColors;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, lg: 20, full: 999 };
export const font = {
  h1: 28, h2: 22, h3: 18, body: 16, small: 14, tiny: 12,
};
