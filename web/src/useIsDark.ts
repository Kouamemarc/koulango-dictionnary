import { useEffect, useState } from "react";
import { useThemePreference } from "./store/themePreference";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Sombre ou clair : le choix explicite de l'utilisateur prime, sinon l'apparence système. */
export function useIsDark(): boolean {
  const override = useThemePreference((s) => s.mode);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return override ? override === "dark" : systemDark;
}
