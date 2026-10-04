import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { MessagesApi } from "../api/endpoints";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await MessagesApi.send({ kind: "contact", name, contact, body });
      setSent(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Envoi impossible. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="form-done">
        <h1>Message envoyé, merci ! 🙏🏾</h1>
        <p>Chaque retour aide à améliorer le dictionnaire.</p>
        <Link to="/" className="about-cta">Retour à l'accueil</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="page-title">Contacter le développeur</h1>
      <p className="page-intro">
        Une idée d'amélioration, un problème rencontré, une erreur dans un mot ? Écrivez-nous : chaque message est lu.
      </p>

      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Votre message *</label>
          <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} required maxLength={3000} autoFocus />
        </div>
        <div className="field">
          <label>Votre nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </div>
        <div className="field">
          <label>Téléphone / WhatsApp ou e-mail</label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} placeholder="Facultatif, si vous souhaitez une réponse" />
        </div>
        {error && <p className="chat-error">{error}</p>}
        <button type="submit" disabled={sending || !body.trim()} style={{ width: "100%" }}>
          {sending ? "Envoi…" : "Envoyer"}
        </button>
      </form>
    </>
  );
}
