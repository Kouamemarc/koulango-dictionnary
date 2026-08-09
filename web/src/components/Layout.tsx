import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useIsDark } from "../useIsDark";
import { useThemePreference } from "../store/themePreference";
import { HomeIcon, PlusIcon, HeartIcon, ClockIcon, SunIcon, MoonIcon } from "./Icons";

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

          <nav className="top-nav">
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <HomeIcon />
              <span>Accueil</span>
            </NavLink>
            <NavLink to="/favoris" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <HeartIcon />
              <span>Favoris</span>
            </NavLink>
            <NavLink to="/historique" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <ClockIcon />
              <span>Historique</span>
            </NavLink>
          </nav>

          <div className="header-actions">
            <button className="icon-btn" onClick={() => toggle(isDark)} aria-label="Changer de thème">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <NavLink to="/contribuer" className={({ isActive }) => `contribute-btn${isActive ? " active" : ""}`}>
              <PlusIcon size={18} />
              <span>Contribuer</span>
            </NavLink>
          </div>
        </header>

        <main className="page">{children}</main>
      </div>
    </div>
  );
}
