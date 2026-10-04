/** Case de consentement obligatoire avant d'envoyer une contribution. */
export const CONSENT_TEXT =
  "J'accepte que ma contribution (textes, enregistrement audio et image) soit publiée librement dans le " +
  "Dictionnaire Koulango et serve à développer une IA koulango.";

export function ConsentCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="consent">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{CONSENT_TEXT}</span>
    </label>
  );
}
