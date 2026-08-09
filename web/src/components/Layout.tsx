import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useIsDark } from "../useIsDark";
import { useThemePreference } from "../store/themePreference";
import { HomeIcon, PlusCircleIcon, HeartIcon, ClockIcon, SunIcon, MoonIcon } from "./Icons";

export function Layout({ children }: { children: ReactNode }) {
  const isDark = useIsDark();
  const toggle = useThemePreference((s) => s.toggle);

  return (
    <div className="app-shell">
      <div className="app-panel">
        <header className="app-header">
          <NavLink to="/" className="brand">
            <img src="/icon.png" alt="" />
            <span className="brand-text">
              <span className="l1">DICTIONNAIRE</span>
              <span className="l2">KOULANGO</span>
            </span>
          </NavLink>
          <button className="icon-btn" onClick={() => toggle(isDark)} aria-label="Changer de thème">
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>

        <main className="page">{children}</main>
      </div>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <HomeIcon />
            Accueil
          </NavLink>
          <NavLink to="/favoris" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <HeartIcon />
            Favoris
          </NavLink>
          <NavLink to="/contribuer" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <PlusCircleIcon />
            Contribuer
          </NavLink>
          <NavLink to="/historique" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <ClockIcon />
            Historique
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
