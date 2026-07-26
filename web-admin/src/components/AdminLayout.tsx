import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const tabClass = (path: string) => (pathname === path ? "tab tab-active" : "tab");

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          {user && <p className="muted">Connecté en tant que {user.username} ({user.role})</p>}
        </div>
        <button className="ghost" onClick={logout}>Déconnexion</button>
      </header>
      <nav className="nav-tabs">
        <Link className={tabClass("/")} to="/">En attente</Link>
        <Link className={tabClass("/words")} to="/words">Mots</Link>
        <Link className={tabClass("/words/new")} to="/words/new">Ajouter un mot</Link>
      </nav>
      {children}
    </div>
  );
}
