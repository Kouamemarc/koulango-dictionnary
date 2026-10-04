import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CloseIcon, InfoIcon, MailIcon, ShieldIcon } from "./Icons";

/** Panneau latéral (ouvert par le bouton ☰ de l'en-tête) : à propos, modération, contact. */
export function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();

  // Se ferme quand on change de page.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Échap pour fermer + pas de défilement de la page derrière le panneau.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const link = ({ isActive }: { isActive: boolean }) => `side-link${isActive ? " active" : ""}`;

  return (
    <div className="side-backdrop" onClick={onClose}>
      <aside className="side-menu" role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
        <div className="side-head">
          <img src="/icon.png" alt="" />
          <span className="brand-text">
            <span className="l1">DICTIONNAIRE</span>
            <span className="l2">KOULANGO</span>
          </span>
          <button className="icon-btn side-close" onClick={onClose} aria-label="Fermer le menu">
            <CloseIcon />
          </button>
        </div>

        <nav className="side-nav">
          <NavLink to="/a-propos" className={link}>
            <InfoIcon />
            <span>
              <strong>À propos</strong>
              <small>Le dictionnaire, son histoire et sa mission</small>
            </span>
          </NavLink>
          <NavLink to="/devenir-moderateur" className={link}>
            <ShieldIcon />
            <span>
              <strong>Devenir modérateur</strong>
              <small>Aider à vérifier les mots proposés</small>
            </span>
          </NavLink>
          <NavLink to="/contact" className={link}>
            <MailIcon />
            <span>
              <strong>Contacter le développeur</strong>
              <small>Une idée, un problème, une suggestion</small>
            </span>
          </NavLink>
        </nav>

        <p className="side-foot">Gratuit, pour valoriser la langue et la culture koulango.</p>
      </aside>
    </div>
  );
}
