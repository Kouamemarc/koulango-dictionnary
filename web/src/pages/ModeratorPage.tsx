import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { MessagesApi } from "../api/endpoints";

const LEVELS = ["Langue maternelle", "Je le parle couramment", "Je le comprends bien", "Je l'apprends"];

export default function ModeratorPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [region, setRegion] = useState("");
  const [level, setLevel] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await MessagesApi.send({ kind: "moderateur", name, contact, region, koulango_level: level, body });
      setSent(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Envoi impossible. Vérifiez les champs et réessayez.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="form-done">
        <h1>Merci {name.trim()} ! 🙏🏾</h1>
        <p>Votre candidature a bien été envoyée. Nous vous recontacterons rapidement.</p>
        <Link to="/" className="about-cta">Retour à l'accueil</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="page-title">Devenir modérateur</h1>
      <p className="page-intro">
        Les modérateurs relisent les mots proposés par la communauté : ils les valident, les corrigent ou les refusent
        avant publication. C'est grâce à eux que le dictionnaire reste fiable.
      </p>
      <ul className="page-points">
        <li>Il faut bien connaître le koulango.</li>
        <li>Tout se fait à distance, depuis un téléphone ou un ordinateur.</li>
        <li>Vous y consacrez le temps que vous voulez, quand vous le pouvez.</li>
      </ul>

      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Nom et prénom *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </div>
        <div className="field">
          <label>Téléphone / WhatsApp ou e-mail *</label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} required maxLength={200} placeholder="Pour vous recontacter" />
        </div>
        <div className="field">
          <label>Ville ou région</label>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            maxLength={120}
            list="regions"
            placeholder="Ex : Bouna, Bondoukou, Abidjan…"
          />
          <datalist id="regions">
            <option value="Bounkani" />
            <option value="Gontougo" />
          </datalist>
        </div>
        <div className="field">
          <label>Votre niveau en koulango</label>
          <div className="pos-row">
            {LEVELS.map((l) => (
              <button key={l} type="button" className={level === l ? "active" : ""} onClick={() => setLevel(level === l ? "" : l)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Pourquoi souhaitez-vous devenir modérateur ? *</label>
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} required maxLength={3000} />
        </div>
        {error && <p className="chat-error">{error}</p>}
        <button type="submit" disabled={sending} style={{ width: "100%" }}>
          {sending ? "Envoi…" : "Envoyer ma candidature"}
        </button>
      </form>
    </>
  );
}
