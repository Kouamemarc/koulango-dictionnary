import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import {
  BookIcon, CloseIcon, ExternalIcon, ImportIcon, InboxIcon, LogoutIcon, MailIcon, MenuIcon, PlusIcon,
} from "./Icons";

const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://koulango-dictionnary-web.onrender.com";
const PENDING_PAGE_SIZE = 50; // taille de page par défaut de GET /admin/pending

const ROLE_LABEL: Record<string, string> = {
  administrateur: "Administrateur",
  moderateur: "Modérateur",
  utilisateur: "Utilisateur",
};

export function AdminLayout({
  title, subtitle, actions, children,
}: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Mêmes clés que les pages : le cache est partagé, les compteurs se mettent à jour après chaque action.
  const pending = useQuery({ queryKey: ["admin", "pending"], queryFn: AdminApi.pending, refetchInterval: 60_000 });
  const messages = useQuery({ queryKey: ["admin", "messages"], queryFn: AdminApi.messages, refetchInterval: 60_000 });
  const pendingCount = pending.data?.length ?? 0;
  const unreadCount = messages.data?.filter((m) => !m.is_read).length ?? 0;

  useEffect(() => setMenuOpen(false), [pathname]);

  const link = ({ isActive }: { isActive: boolean }) => `side-link${isActive ? " active" : ""}`;
  const initials = (user?.full_name || user?.username || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`shell${menuOpen ? " menu-open" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/icon.png" alt="" />
          <div>
            <span className="brand-l1">DICTIONNAIRE</span>
            <span className="brand-l2">KOULANGO</span>
            <span className="brand-tag">Administration</span>
          </div>
          <button className="icon-btn sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu">
            <CloseIcon />
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="side-group">Modération</p>
          <NavLink to="/" end className={link}>
            <InboxIcon />
            <span>En attente</span>
            {pendingCount > 0 && (
              <span className="count">{pendingCount >= PENDING_PAGE_SIZE ? `${PENDING_PAGE_SIZE}+` : pendingCount}</span>
            )}
          </NavLink>
          <NavLink to="/messages" className={link}>
            <MailIcon />
            <span>Messages</span>
            {unreadCount > 0 && <span className="count">{unreadCount}</span>}
          </NavLink>

          <p className="side-group">Dictionnaire</p>
          <NavLink to="/words" end className={link}>
            <BookIcon />
            <span>Mots</span>
          </NavLink>
          <NavLink to="/words/new" className={link}>
            <PlusIcon />
            <span>Ajouter un mot</span>
          </NavLink>
          <NavLink to="/import" className={link}>
            <ImportIcon />
            <span>Importer une publication</span>
          </NavLink>

          <a className="side-link side-external" href={PUBLIC_SITE_URL} target="_blank" rel="noreferrer">
            <ExternalIcon />
            <span>Voir le site public</span>
          </a>
        </nav>

        {user && (
          <div className="sidebar-user">
            <span className="avatar">{initials}</span>
            <div className="user-info">
              <strong>{user.full_name || user.username}</strong>
              <span>{ROLE_LABEL[user.role] ?? user.role}</span>
            </div>
            <button className="icon-btn" onClick={logout} aria-label="Déconnexion" title="Déconnexion">
              <LogoutIcon />
            </button>
          </div>
        )}
      </aside>

      <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">
            <MenuIcon />
          </button>
          <div className="topbar-titles">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="topbar-actions">{actions}</div>}
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
