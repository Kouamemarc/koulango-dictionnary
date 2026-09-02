import { useInstallPrompt } from "../useInstallPrompt";
import { CloseCircleIcon, ShareIcon } from "./Icons";

export function InstallBanner() {
  const { installed, dismissed, dismiss, canInstall, promptInstall, showIOSInstructions } = useInstallPrompt();

  if (installed || dismissed || !(canInstall || showIOSInstructions)) return null;

  return (
    <div className="install-banner">
      <img src="/icon.png" alt="" className="install-banner-icon" />
      <div className="install-banner-text">
        <strong>Installer le Dictionnaire Koulango</strong>
        {showIOSInstructions ? (
          <span>
            Appuie sur <ShareIcon size={13} /> Partager, puis « Sur l'écran d'accueil ».
          </span>
        ) : (
          <span>Accède-y en un tap, hors ligne, comme une vraie appli.</span>
        )}
      </div>
      {canInstall && (
        <button className="install-banner-btn" onClick={promptInstall}>
          Installer
        </button>
      )}
      <button className="icon-btn install-banner-close" onClick={dismiss} aria-label="Ne plus afficher">
        <CloseCircleIcon size={20} />
      </button>
    </div>
  );
}
