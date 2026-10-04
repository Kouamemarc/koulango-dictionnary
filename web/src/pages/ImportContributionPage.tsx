import { useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { ContributionsApi } from "../api/endpoints";
import type { BatchItemResult, ImportEntry, ImportImage } from "../api/types";
import { ConsentCheckbox, IMPORT_CONSENT_TEXT } from "../components/ConsentCheckbox";
import { CloseCircleIcon } from "../components/Icons";

const PARTS_OF_SPEECH = ["nom", "verbe", "adjectif", "pronom", "adverbe", "interjection"];
const MAX_IMAGES = 5;
const MAX_SIDE = 2000; // px : assez pour lire une capture de téléphone, sans dépasser les limites de l'API

interface PendingImage extends ImportImage {
  preview: string;
}

interface Row {
  entry: ImportEntry;
  selected: boolean;
}

/** Redimensionne une capture et la convertit en JPEG base64 (sans le préfixe data:). */
function toImage(file: File): Promise<PendingImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      URL.revokeObjectURL(url);
      resolve({ media_type: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl });
    };
    img.onerror = () => reject(new Error(`Image illisible : ${file.name}`));
    img.src = url;
  });
}

export default function ImportContributionPage() {
  const [text, setText] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BatchItemResult[] | null>(null);

  const onImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_IMAGES - images.length);
    e.target.value = "";
    try {
      const added = await Promise.all(files.map(toImage));
      setImages((imgs) => [...imgs, ...added]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const extract = async () => {
    setExtracting(true);
    setError(null);
    setNotes(null);
    try {
      const res = await ContributionsApi.importExtract({
        text,
        images: images.map(({ media_type, data }) => ({ media_type, data })),
      });
      setRows(res.entries.map((entry) => ({ entry, selected: entry.existing !== "exists" })));
      setNotes(res.notes);
      if (res.entries.length === 0) setError("Aucun mot koulango trouvé dans cette publication.");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Analyse impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setExtracting(false);
    }
  };

  const update = (i: number, patch: Partial<ImportEntry>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, entry: { ...r.entry, ...patch } } : r)));
  const toggle = (i: number) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r)));
  const selected = rows.filter((r) => r.selected && r.entry.term.trim());

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await ContributionsApi.proposeBatch(
        selected.map(({ entry }) => ({
          term: entry.term.trim(),
          fr_translation: entry.fr_translation || undefined,
          en_translation: entry.en_translation || undefined,
          part_of_speech: entry.part_of_speech || undefined,
          definition: entry.definition || undefined,
          example: entry.example || undefined,
          example_translation: entry.example_translation || undefined,
          pronunciation: entry.pronunciation || undefined,
          source: source.trim() || undefined,
          ai_consent: consent,
        })),
      );
      setResults(res);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Envoi impossible. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  const restart = () => {
    setText("");
    setImages([]);
    setRows([]);
    setNotes(null);
    setResults(null);
    setError(null);
  };

  if (results) {
    const created = results.filter((r) => r.status === "created");
    const skipped = results.filter((r) => r.status === "skipped");
    return (
      <div className="form-done">
        <h1>Merci pour votre contribution ❤️</h1>
        <p>
          {created.length} mot(s) envoyé(s) : ils seront vérifiés par un modérateur avant publication.
          {skipped.length > 0 && ` ${skipped.length} ignoré(s) : ${skipped.map((s) => `${s.term} (${s.detail})`).join(", ")}.`}
        </p>
        <div className="about-actions">
          <button onClick={restart}>Importer une autre publication</button>
          <Link to="/" className="about-link">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="page-title">Importer une publication</h1>
      <p className="page-intro">
        Vous avez vu des mots koulango dans une publication, par exemple dans un groupe Facebook ? Collez son texte ou
        ajoutez des captures d'écran : nous repérons les mots et leurs traductions, vous vérifiez, puis vous envoyez.
      </p>

      <div className="field">
        <label>Texte de la publication</label>
        <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Mál = riz\nDígô = la nourriture\n…"} />
      </div>

      <div className="field">
        <label>Captures d'écran ({images.length}/{MAX_IMAGES})</label>
        {images.length > 0 && (
          <div className="import-images">
            {images.map((img, i) => (
              <div key={i} className="import-thumb">
                <img src={img.preview} alt="" />
                <button type="button" className="remove-btn" aria-label="Retirer" onClick={() => setImages((imgs) => imgs.filter((_, idx) => idx !== i))}>
                  <CloseCircleIcon />
                </button>
              </div>
            ))}
          </div>
        )}
        {images.length < MAX_IMAGES && (
          <label className="file-btn" style={{ flex: "none" }}>
            🖼️ Ajouter des captures
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={onImages} hidden />
          </label>
        )}
      </div>

      <button onClick={extract} disabled={extracting || (!text.trim() && images.length === 0)} style={{ width: "100%" }}>
        {extracting ? "Analyse en cours… (jusqu'à 1 min)" : "Trouver les mots"}
      </button>

      {error && <p className="chat-error">{error}</p>}
      {notes && <p className="hint">💡 {notes}</p>}

      {rows.length > 0 && (
        <>
          <h2 className="import-title">{rows.length} mot(s) trouvé(s) — vérifiez avant d'envoyer</h2>
          <ul className="import-list">
            {rows.map((r, i) => (
              <li key={i} className={`import-row${r.selected ? "" : " import-row-off"}`}>
                <div className="import-row-head">
                  <label className="import-check">
                    <input type="checkbox" checked={r.selected} onChange={() => toggle(i)} />
                    <strong>{r.entry.term || "—"}</strong>
                  </label>
                  {r.entry.existing === "exists" && <span className="import-badge exists">Déjà dans le dictionnaire</span>}
                  {r.entry.existing === "similar" && <span className="import-badge similar">Proche de : {r.entry.matches.join(", ")}</span>}
                  {r.entry.existing === "new" && <span className="import-badge new">Nouveau</span>}
                </div>
                <div className="import-grid">
                  <input placeholder="Mot koulango" value={r.entry.term} onChange={(e) => update(i, { term: e.target.value })} />
                  <input placeholder="Traduction française" value={r.entry.fr_translation ?? ""} onChange={(e) => update(i, { fr_translation: e.target.value || null })} />
                  <select value={r.entry.part_of_speech ?? ""} onChange={(e) => update(i, { part_of_speech: e.target.value || null })}>
                    <option value="">Nature (aucune)</option>
                    {PARTS_OF_SPEECH.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input placeholder="Exemple en koulango" value={r.entry.example ?? ""} onChange={(e) => update(i, { example: e.target.value || null })} />
                  <input placeholder="Traduction de l'exemple" value={r.entry.example_translation ?? ""} onChange={(e) => update(i, { example_translation: e.target.value || null })} />
                </div>
              </li>
            ))}
          </ul>

          <div className="field">
            <label>D'où viennent ces mots ?</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} maxLength={200} placeholder="Ex : groupe Facebook « Parlons koulango », publication de Jean K." />
          </div>
          <ConsentCheckbox checked={consent} onChange={setConsent} text={IMPORT_CONSENT_TEXT} />
          <button onClick={send} disabled={sending || !consent || selected.length === 0} style={{ width: "100%" }}>
            {sending ? "Envoi…" : `Envoyer ${selected.length} mot(s)`}
          </button>
          <p className="hint">Chaque mot sera vérifié par un modérateur avant d'être publié.</p>
        </>
      )}
    </>
  );
}
