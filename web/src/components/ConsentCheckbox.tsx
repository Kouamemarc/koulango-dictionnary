/** Case de consentement obligatoire avant d'envoyer une contribution. */
export const CONSENT_TEXT =
  "J'accepte que ma contribution (textes, enregistrement audio et image) soit publiée librement dans le " +
  "Dictionnaire Koulango et serve à développer une IA koulango.";

/** Pour l'import : la personne partage souvent les mots d'un autre auteur. */
export const IMPORT_CONSENT_TEXT =
  "J'ai le droit de partager ces mots (j'en suis l'auteur ou l'auteur est d'accord) et j'accepte qu'ils soient " +
  "publiés librement dans le Dictionnaire Koulango et servent à développer une IA koulango.";

export function ConsentCheckbox({
  checked, onChange, text = CONSENT_TEXT,
}: { checked: boolean; onChange: (v: boolean) => void; text?: string }) {
  return (
    <label className="consent">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{text}</span>
    </label>
  );
}
