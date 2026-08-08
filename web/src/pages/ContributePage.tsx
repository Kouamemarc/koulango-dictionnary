import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ContributionsApi, MediaApi } from "../api/endpoints";
import { CloseCircleIcon } from "../components/Icons";
import type { Suggestion, TranslationLang, WordCreate } from "../api/types";

type EntryType = "mot" | "expression";

const PARTS_OF_SPEECH = ["nom", "verbe", "adjectif", "pronom", "adverbe", "interjection"] as const;

/** Audio enregistré/choisi localement, pas encore envoyé au serveur. */
interface PendingAudio {
  blob: Blob;
  name: string;
  previewUrl: string;
}

interface TranslationRow {
  language: TranslationLang;
  text: string;
  example: string;
  example_translation: string;
}

export default function ContributePage() {
  const navigate = useNavigate();
  const [entryType, setEntryType] = useState<EntryType>("mot");
  const [form, setForm] = useState<WordCreate>({ term: "" });
  const [translations, setTranslations] = useState<TranslationRow[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const set = (k: keyof WordCreate) => (v: string) => setForm((f) => ({ ...f, [k]: v || undefined }));
  const updateTranslation = (i: number, patch: Partial<TranslationRow>) =>
    setTranslations((t) => t.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  const busy = uploadingImage || loading || isRecording;

  const onImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const { url } = await MediaApi.upload(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch {
      alert("Envoi de l'image impossible.");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const setPendingAudioSafe = (next: PendingAudio | null) => {
    if (pendingAudio?.previewUrl) URL.revokeObjectURL(pendingAudio.previewUrl);
    setPendingAudio(next);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setPendingAudioSafe({ blob, name: "prononciation.webm", previewUrl: URL.createObjectURL(blob) });
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      alert("Impossible d'accéder au micro.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const onAudioFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAudioSafe({ blob: file, name: file.name, previewUrl: URL.createObjectURL(file) });
  };

  const playPendingAudio = () => {
    if (!pendingAudio) return;
    if (!audioPlayerRef.current) audioPlayerRef.current = new Audio();
    audioPlayerRef.current.src = pendingAudio.previewUrl;
    audioPlayerRef.current.play().catch(() => {});
  };

  /** Étape 1 : vérification intelligente avant l'enregistrement. */
  const handleCheck = async () => {
    if (!form.term?.trim()) return alert(entryType === "mot" ? "Le mot est requis." : "L'expression est requise.");
    setLoading(true);
    try {
      const res = await ContributionsApi.check(form.term);
      if (res.exists) {
        alert(res.message);
        return;
      }
      if (res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
        setShowModal(true); // « Avez-vous voulu dire… ? »
      } else {
        await submit(false);
      }
    } catch {
      alert("Vérification impossible.");
    } finally {
      setLoading(false);
    }
  };

  /** Étape 2 : envoie l'audio en attente (s'il y en a un) puis enregistre la proposition. */
  const submit = async (force: boolean) => {
    setLoading(true);
    try {
      let audio_url = form.audio_url;
      if (pendingAudio) {
        try {
          const uploaded = await MediaApi.upload(pendingAudio.blob, pendingAudio.name);
          audio_url = uploaded.url;
        } catch {
          alert("Envoi de l'audio impossible.");
          return;
        }
      }
      const validTranslations = translations
        .filter((t) => t.text.trim())
        .map((t) => ({
          ...t,
          example: t.example.trim() || undefined,
          example_translation: t.example_translation.trim() || undefined,
        }));
      await ContributionsApi.propose({ ...form, audio_url, translations: validTranslations, force_create: force });
      alert("Mot ou expression proposé avec succès, ce sera vérifié et validé, merci pour votre contribution ❤️");
      navigate("/");
    } catch (e: any) {
      alert(e?.response?.data?.detail?.message ?? "Enregistrement impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 style={{ fontSize: 20, marginTop: 0 }}>Proposition de mot ou expression</h1>

      <div className="type-toggle">
        <button className={entryType === "mot" ? "active" : ""} onClick={() => setEntryType("mot")}>Mot</button>
        <button className={entryType === "expression" ? "active" : ""} onClick={() => setEntryType("expression")}>Expression</button>
      </div>

      <div className="field">
        <label>{entryType === "mot" ? "Mot *" : "Expression *"}</label>
        <input
          placeholder={entryType === "mot" ? "Ex : bonjour" : "Ex : comment ça va ?"}
          value={form.term}
          onChange={(e) => set("term")(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label>Traduction française</label>
        <input value={form.fr_translation ?? ""} onChange={(e) => set("fr_translation")(e.target.value)} />
      </div>

      <div className="field">
        <label>Nature du mot</label>
        <div className="pos-row">
          {PARTS_OF_SPEECH.map((pos) => (
            <button
              key={pos}
              type="button"
              className={form.part_of_speech === pos ? "active" : ""}
              onClick={() => setForm((f) => ({ ...f, part_of_speech: f.part_of_speech === pos ? undefined : pos }))}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Autres traductions (un mot peut avoir plusieurs sens)</label>
        {translations.map((t, i) => (
          <div className="translation-block" key={i}>
            <div className="translation-row">
              <select value={t.language} onChange={(e) => updateTranslation(i, { language: e.target.value as TranslationLang })}>
                <option value="fr">FR</option>
                <option value="en">EN</option>
              </select>
              <div className="field">
                <input placeholder="Traduction" value={t.text} onChange={(e) => updateTranslation(i, { text: e.target.value })} />
              </div>
              <button type="button" className="remove-btn" onClick={() => setTranslations((ts) => ts.filter((_, idx) => idx !== i))}>
                <CloseCircleIcon />
              </button>
            </div>
            <div className="field">
              <input
                placeholder="Exemple d'utilisation (facultatif)"
                value={t.example}
                onChange={(e) => updateTranslation(i, { example: e.target.value })}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <input
                placeholder="Traduction de l'exemple (facultatif)"
                value={t.example_translation}
                onChange={(e) => updateTranslation(i, { example_translation: e.target.value })}
              />
            </div>
          </div>
        ))}
        <button type="button" className="ghost" onClick={() => setTranslations((t) => [...t, { language: "fr", text: "", example: "", example_translation: "" }])}>
          + Ajouter une traduction
        </button>
      </div>

      <div className="field">
        <label>Définition</label>
        <textarea rows={2} value={form.definition ?? ""} onChange={(e) => set("definition")(e.target.value)} />
      </div>
      <div className="field">
        <label>Exemple</label>
        <textarea rows={2} value={form.example ?? ""} onChange={(e) => set("example")(e.target.value)} />
      </div>
      <div className="field">
        <label>Traduction de l'exemple</label>
        <textarea rows={2} value={form.example_translation ?? ""} onChange={(e) => set("example_translation")(e.target.value)} />
      </div>
      <div className="field">
        <label>Prononciation</label>
        <input value={form.pronunciation ?? ""} onChange={(e) => set("pronunciation")(e.target.value)} />
      </div>

      <div className="field">
        <label>Prononciation audio</label>
        {pendingAudio && !isRecording && (
          <div className="audio-preview">
            <button type="button" className="ghost" onClick={playPendingAudio}>▶ Écouter</button>
            <button type="button" className="danger" onClick={() => setPendingAudioSafe(null)}>Supprimer</button>
          </div>
        )}
        <div className="media-row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className={isRecording ? "danger" : "ghost"}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? "Arrêter l'enregistrement" : pendingAudio ? "Réenregistrer" : "Enregistrer"}
          </button>
          <label className="ghost" style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: isRecording ? "not-allowed" : "pointer" }}>
            Choisir un fichier
            <input type="file" accept="audio/*" onChange={onAudioFileChange} disabled={isRecording} style={{ display: "none" }} />
          </label>
        </div>
        {pendingAudio && <p className="hint">Sera envoyé avec la proposition.</p>}
      </div>

      <div className="field">
        <label>Illustration</label>
        {imagePreview && <img src={imagePreview} alt="" className="image-preview" />}
        <label className="ghost" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {uploadingImage ? "Envoi…" : imagePreview ? "Changer l'image" : "Choisir une image"}
          <input type="file" accept="image/*" onChange={onImageChange} disabled={uploadingImage} style={{ display: "none" }} />
        </label>
      </div>

      <div className="field">
        <label>Votre nom</label>
        <input placeholder="Ex : Marc BK" value={form.source ?? ""} onChange={(e) => set("source")(e.target.value)} />
      </div>
      <div className="field">
        <label>Traduction anglaise</label>
        <input value={form.en_translation ?? ""} onChange={(e) => set("en_translation")(e.target.value)} />
      </div>

      <button onClick={handleCheck} disabled={busy} style={{ width: "100%" }}>
        {loading ? "…" : "Proposer"}
      </button>

      {showModal && (
        <div className="backdrop">
          <div className="sheet">
            <h2>Le mot n'existe pas.</h2>
            <p>Avez-vous voulu dire :</p>
            {suggestions.map((s) => (
              <p className="sugg" key={s.word_id}>
                • {s.term} <span className="simi">(similarité {Math.round(s.similarity * 100)}%)</span>
              </p>
            ))}
            <p>Est-ce le même mot ?</p>
            <div className="sheet-actions">
              <button className="ghost" onClick={() => { setShowModal(false); navigate("/"); }}>
                Oui — c'est le même, annuler
              </button>
              <button onClick={() => { setShowModal(false); submit(true); }}>
                Non — c'est un nouveau mot
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
