import { useState } from "react";
import type { ChangeEvent } from "react";
import { AdminApi } from "../api/endpoints";
import type { ImportEntry, ImportImage } from "../api/types";
import { AdminLayout } from "../components/AdminLayout";

const PARTS_OF_SPEECH = ["nom", "verbe", "adjectif", "pronom", "adverbe", "interjection"];
const MAX_IMAGES = 5;
const MAX_SIDE = 2000; // px : assez pour lire une capture de téléphone, sans dépasser les limites de l'API

interface PendingImage extends ImportImage {
  preview: string;
  name: string;
}

type RowResult = { kind: "ok" } | { kind: "error"; message: string };

interface Row {
  entry: ImportEntry;
  selected: boolean;
  result?: RowResult;
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
      resolve({ media_type: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl, name: file.name });
    };
    img.onerror = () => reject(new Error(`Image illisible : ${file.name}`));
    img.src = url;
  });
}

const STATUS_LABEL: Record<ImportEntry["existing"], string> = {
  new: "Nouveau",
  exists: "Existe déjà",
  similar: "Mot proche existant",
  unknown: "Non vérifié",
};

export default function ImportPage() {
  const [text, setText] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [source, setSource] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await AdminApi.importExtract({
        text,
        images: images.map(({ media_type, data }) => ({ media_type, data })),
      });
      setRows(res.entries.map((entry) => ({ entry, selected: entry.existing !== "exists" })));
      setNotes(res.notes);
      if (res.entries.length === 0) setError("Aucun mot koulango trouvé dans cette publication.");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Extraction impossible. Réessayez.");
    } finally {
      setExtracting(false);
    }
  };

  const update = (i: number, patch: Partial<ImportEntry>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, entry: { ...r.entry, ...patch } } : r)));
  const toggle = (i: number) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r)));

  const toPublish = rows.filter((r) => r.selected && r.result?.kind !== "ok" && r.entry.term.trim());

  /** Publie les entrées retenues une à une, pour pouvoir signaler un échec par ligne. */
  const publish = async () => {
    setPublishing(true);
    for (let i = 0; i < rows.length; i++) {
      const { entry, selected, result } = rows[i];
      if (!selected || result?.kind === "ok" || !entry.term.trim()) continue;
      let next: RowResult;
      try {
        await AdminApi.createWord({
          term: entry.term.trim(),
          fr_translation: entry.fr_translation || undefined,
          en_translation: entry.en_translation || undefined,
          part_of_speech: entry.part_of_speech || undefined,
          definition: entry.definition || undefined,
          example: entry.example || undefined,
          example_translation: entry.example_translation || undefined,
          pronunciation: entry.pronunciation || undefined,
          source: source.trim() || undefined,
        });
        next = { kind: "ok" };
      } catch (e: any) {
        const detail = e?.response?.data?.detail;
        next = { kind: "error", message: typeof detail === "string" ? detail : "Échec de la publication." };
      }
      setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, result: next } : r)));
    }
    setPublishing(false);
  };

  const reset = () => {
    setText("");
    setImages([]);
    setRows([]);
    setNotes(null);
    setError(null);
  };

  const field = (i: number, key: keyof ImportEntry, placeholder: string, disabled: boolean) => (
    <input
      placeholder={placeholder}
      value={(rows[i].entry[key] as string | null) ?? ""}
      onChange={(e) => update(i, { [key]: e.target.value || null } as Partial<ImportEntry>)}
      disabled={disabled}
    />
  );

  return (
    <AdminLayout title="Importer une publication">
      <p className="muted">
        Collez le texte d'une publication (par exemple d'un groupe Facebook) et/ou ajoutez des captures d'écran :
        l'IA repère les mots koulango et leurs traductions. Vous relisez, corrigez, puis publiez.
      </p>
      <p className="notice">
        Assurez-vous que l'auteur de la publication est d'accord pour que ses mots soient repris dans le
        dictionnaire, et citez-le dans « Source ».
      </p>

      <div className="field">
        <label>Texte de la publication</label>
        <textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Mál = riz\nDígô = la nourriture\n…"} />
      </div>

      <div className="field">
        <label>Captures d'écran ({images.length}/{MAX_IMAGES})</label>
        {images.length > 0 && (
          <div className="import-images">
            {images.map((img, i) => (
              <div key={i} className="import-thumb">
                <img src={img.preview} alt={img.name} />
                <button className="ghost" onClick={() => setImages((imgs) => imgs.filter((_, idx) => idx !== i))}>Retirer</button>
              </div>
            ))}
          </div>
        )}
        {images.length < MAX_IMAGES && (
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={onImages} />
        )}
      </div>

      <div className="field">
        <label>Source (créditée sur chaque mot publié)</label>
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex : Groupe Facebook « Parlons koulango » — publication de Jean K." />
      </div>

      <div className="actions">
        <button onClick={extract} disabled={extracting || (!text.trim() && images.length === 0)}>
          {extracting ? "Analyse en cours… (jusqu'à 1 min)" : "Extraire les mots"}
        </button>
        {(rows.length > 0 || text || images.length > 0) && (
          <button className="ghost" onClick={reset} disabled={extracting || publishing}>Nouvelle publication</button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {notes && <p className="notice">🤖 {notes}</p>}

      {rows.length > 0 && (
        <>
          <h2 className="import-title">{rows.length} entrée(s) trouvée(s) — relisez avant de publier</h2>
          <ul className="import-list">
            {rows.map((r, i) => {
              const done = r.result?.kind === "ok";
              return (
                <li key={i} className={`import-row${r.selected ? "" : " import-row-off"}`}>
                  <div className="import-row-head">
                    <label className="import-check">
                      <input type="checkbox" checked={r.selected} onChange={() => toggle(i)} disabled={done || publishing} />
                      <strong>{r.entry.term || "—"}</strong>
                    </label>
                    <span className={`badge badge-${r.entry.existing}`}>
                      {STATUS_LABEL[r.entry.existing]}
                      {r.entry.matches.length > 0 && r.entry.existing === "similar" ? ` : ${r.entry.matches.join(", ")}` : ""}
                    </span>
                  </div>
                  <div className="import-grid">
                    {field(i, "term", "Mot koulango *", done)}
                    {field(i, "fr_translation", "Traduction française", done)}
                    {field(i, "en_translation", "Traduction anglaise", done)}
                    <select
                      value={r.entry.part_of_speech ?? ""}
                      onChange={(e) => update(i, { part_of_speech: e.target.value || null })}
                      disabled={done}
                    >
                      <option value="">Nature (aucune)</option>
                      {PARTS_OF_SPEECH.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {field(i, "example", "Exemple en koulango", done)}
                    {field(i, "example_translation", "Traduction de l'exemple", done)}
                    {field(i, "definition", "Définition", done)}
                    {field(i, "pronunciation", "Prononciation", done)}
                  </div>
                  {r.result?.kind === "ok" && <p className="import-ok">✓ Publié</p>}
                  {r.result?.kind === "error" && <p className="error">{r.result.message}</p>}
                </li>
              );
            })}
          </ul>
          <button onClick={publish} disabled={publishing || toPublish.length === 0}>
            {publishing ? "Publication…" : `Publier ${toPublish.length} mot(s)`}
          </button>
        </>
      )}
    </AdminLayout>
  );
}
