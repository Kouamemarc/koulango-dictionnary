import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminApi, MediaApi, WordsApi } from "../api/endpoints";
import { AdminLayout } from "../components/AdminLayout";
import type { Audio, Definition, Example, Pronunciation, Translation } from "../api/types";

const PARTS_OF_SPEECH = ["nom", "verbe", "adjectif", "pronom", "adverbe", "interjection"];

interface FormState {
  term: string;
  fr_translation: string;
  en_translation: string;
  part_of_speech: string;
  source: string;
  image_url: string;
  translations: Translation[];
  definitions: Definition[];
  examples: Example[];
  pronunciations: Pronunciation[];
  audios: Audio[];
}

const EMPTY: FormState = {
  term: "", fr_translation: "", en_translation: "", part_of_speech: "", source: "", image_url: "",
  translations: [], definitions: [], examples: [], pronunciations: [], audios: [],
};

function updateAt<T>(list: T[], i: number, patch: Partial<T>): T[] {
  return list.map((item, idx) => (idx === i ? { ...item, ...patch } : item));
}

/** Audio enregistré/choisi localement pour une ligne, pas encore envoyé au serveur. */
interface PendingAudio {
  blob: Blob;
  name: string;
  previewUrl: string;
}

export default function WordFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [pendingAudios, setPendingAudios] = useState<(PendingAudio | undefined)[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const setPendingAudio = (i: number, next: PendingAudio | undefined) => {
    setPendingAudios((p) => {
      const copy = [...p];
      if (copy[i]?.previewUrl) URL.revokeObjectURL(copy[i]!.previewUrl);
      copy[i] = next;
      return copy;
    });
  };

  const { data: existing, isLoading } = useQuery({
    queryKey: ["word", id],
    queryFn: () => WordsApi.detail(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        term: existing.term,
        fr_translation: existing.fr_translation ?? "",
        en_translation: existing.en_translation ?? "",
        part_of_speech: existing.part_of_speech ?? "",
        source: existing.source ?? "",
        image_url: existing.image_url ?? "",
        translations: existing.translations,
        definitions: existing.definitions,
        examples: existing.examples,
        pronunciations: existing.pronunciations,
        audios: existing.audios,
      });
    }
  }, [existing]);

  const submit = useMutation({
    mutationFn: async () => {
      // Envoie les audios enregistrés/choisis en local juste avant l'enregistrement du mot.
      const audios = await Promise.all(
        form.audios.map(async (a, i) => {
          const pending = pendingAudios[i];
          if (!pending) return a;
          const { url } = await MediaApi.upload(pending.blob, pending.name);
          return { ...a, url };
        })
      );

      const editPayload = {
        term: form.term,
        fr_translation: form.fr_translation || null,
        en_translation: form.en_translation || null,
        part_of_speech: form.part_of_speech || null,
        source: form.source || null,
        image_url: form.image_url || null,
        translations: form.translations,
        definitions: form.definitions,
        examples: form.examples,
        pronunciations: form.pronunciations,
        audios,
      };
      if (isEdit) return AdminApi.updateWord(Number(id), editPayload);

      const created = await AdminApi.createWord({
        term: form.term,
        fr_translation: form.fr_translation || undefined,
        en_translation: form.en_translation || undefined,
        part_of_speech: form.part_of_speech || undefined,
        source: form.source || undefined,
        image_url: form.image_url || undefined,
        translations: form.translations,
        definition: form.definitions[0]?.text,
        example: form.examples[0]?.sentence,
        pronunciation: form.pronunciations[0]?.phonetic ?? form.pronunciations[0]?.ipa ?? undefined,
        audio_url: audios[0]?.url,
      });
      const hasExtra =
        form.translations.length > 0 || form.definitions.length > 1 || form.examples.length > 1 ||
        form.pronunciations.length > 1 || audios.length > 1;
      return hasExtra ? AdminApi.updateWord(created.id, { ...editPayload, audios }) : created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["words"] });
      navigate("/words");
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit.mutate();
  };

  const onImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { url } = await MediaApi.upload(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch {
      alert("Envoi de l'image impossible.");
    } finally {
      setUploadingImage(false);
    }
  };

  const onAudioFileChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAudio(i, { blob: file, name: file.name, previewUrl: URL.createObjectURL(file) });
  };

  const startRecording = async (i: number) => {
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
        setPendingAudio(i, { blob, name: "prononciation.webm", previewUrl: URL.createObjectURL(blob) });
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingIndex(i);
    } catch {
      alert("Impossible d'accéder au micro.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecordingIndex(null);
  };

  const removeAudioRow = (i: number) => {
    setForm((f) => ({ ...f, audios: f.audios.filter((_, idx) => idx !== i) }));
    setPendingAudios((p) => p.filter((_, idx) => idx !== i));
  };

  if (isEdit && isLoading) return <AdminLayout title="Modifier un mot"><p>Chargement…</p></AdminLayout>;

  return (
    <AdminLayout title={isEdit ? `Modifier « ${form.term} »` : "Ajouter un mot"}>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Terme *</label>
          <input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} required autoFocus />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Traduction française</label>
            <input value={form.fr_translation} onChange={(e) => setForm({ ...form, fr_translation: e.target.value })} />
          </div>
          <div className="field">
            <label>Traduction anglaise</label>
            <input value={form.en_translation} onChange={(e) => setForm({ ...form, en_translation: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Nature du mot</label>
          <select value={form.part_of_speech} onChange={(e) => setForm({ ...form, part_of_speech: e.target.value })}>
            <option value="">—</option>
            {PARTS_OF_SPEECH.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>
        <div className="subentity-block">
          <h3>Autres traductions</h3>
          <p className="muted" style={{ marginTop: 0 }}>Un mot peut avoir plusieurs sens.</p>
          {form.translations.map((t, i) => (
            <div className="subentity-row" key={i} style={{ flexWrap: "wrap" }}>
              <select
                value={t.language}
                onChange={(e) => setForm({ ...form, translations: updateAt(form.translations, i, { language: e.target.value as "fr" | "en" }) })}
              >
                <option value="fr">FR</option>
                <option value="en">EN</option>
              </select>
              <input placeholder="Traduction" value={t.text}
                onChange={(e) => setForm({ ...form, translations: updateAt(form.translations, i, { text: e.target.value }) })} />
              <button type="button" className="danger"
                onClick={() => setForm({ ...form, translations: form.translations.filter((_, idx) => idx !== i) })}>✕</button>
              <input placeholder="Exemple d'utilisation (facultatif)" style={{ width: "100%" }} value={t.example ?? ""}
                onChange={(e) => setForm({ ...form, translations: updateAt(form.translations, i, { example: e.target.value }) })} />
              <input placeholder="Traduction de l'exemple (facultatif)" style={{ width: "100%" }} value={t.example_translation ?? ""}
                onChange={(e) => setForm({ ...form, translations: updateAt(form.translations, i, { example_translation: e.target.value }) })} />
            </div>
          ))}
          <button type="button" className="ghost"
            onClick={() => setForm({ ...form, translations: [...form.translations, { language: "fr", text: "", example: "", example_translation: "" }] })}>
            + Ajouter une traduction
          </button>
        </div>

        <div className="field">
          <label>Illustration</label>
          {form.image_url && (
            <img src={form.image_url} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }} />
          )}
          <input type="file" accept="image/*" onChange={onImageChange} disabled={uploadingImage} />
          {uploadingImage && <p className="muted">Envoi en cours…</p>}
        </div>
        <div className="field">
          <label>Ajouté par</label>
          <input
            placeholder="Ex : Marc BK"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          />
        </div>

        <div className="subentity-block">
          <h3>Définitions</h3>
          {form.definitions.map((d, i) => (
            <div className="subentity-row" key={i}>
              <input placeholder="Texte" value={d.text}
                onChange={(e) => setForm({ ...form, definitions: updateAt(form.definitions, i, { text: e.target.value }) })} />
              <button type="button" className="danger"
                onClick={() => setForm({ ...form, definitions: form.definitions.filter((_, idx) => idx !== i) })}>✕</button>
            </div>
          ))}
          <button type="button" className="ghost"
            onClick={() => setForm({ ...form, definitions: [...form.definitions, { text: "" }] })}>
            + Ajouter une définition
          </button>
        </div>

        <div className="subentity-block">
          <h3>Exemples</h3>
          {form.examples.map((ex, i) => (
            <div className="subentity-row" key={i}>
              <input placeholder="Phrase" value={ex.sentence}
                onChange={(e) => setForm({ ...form, examples: updateAt(form.examples, i, { sentence: e.target.value }) })} />
              <input placeholder="Traduction" value={ex.translation ?? ""}
                onChange={(e) => setForm({ ...form, examples: updateAt(form.examples, i, { translation: e.target.value }) })} />
              <button type="button" className="danger"
                onClick={() => setForm({ ...form, examples: form.examples.filter((_, idx) => idx !== i) })}>✕</button>
            </div>
          ))}
          <button type="button" className="ghost"
            onClick={() => setForm({ ...form, examples: [...form.examples, { sentence: "" }] })}>
            + Ajouter un exemple
          </button>
        </div>

        <div className="subentity-block">
          <h3>Prononciations</h3>
          {form.pronunciations.map((p, i) => (
            <div className="subentity-row" key={i}>
              <input placeholder="API (ex: /kɔ̃/)" value={p.ipa ?? ""}
                onChange={(e) => setForm({ ...form, pronunciations: updateAt(form.pronunciations, i, { ipa: e.target.value }) })} />
              <input placeholder="Graphie simplifiée" value={p.phonetic ?? ""}
                onChange={(e) => setForm({ ...form, pronunciations: updateAt(form.pronunciations, i, { phonetic: e.target.value }) })} />
              <button type="button" className="danger"
                onClick={() => setForm({ ...form, pronunciations: form.pronunciations.filter((_, idx) => idx !== i) })}>✕</button>
            </div>
          ))}
          <button type="button" className="ghost"
            onClick={() => setForm({ ...form, pronunciations: [...form.pronunciations, {}] })}>
            + Ajouter une prononciation
          </button>
        </div>

        <div className="subentity-block">
          <h3>Audios</h3>
          {form.audios.map((a, i) => {
            const pending = pendingAudios[i];
            const previewSrc = pending?.previewUrl || a.url || undefined;
            return (
              <div className="subentity-row" key={i} style={{ flexWrap: "wrap" }}>
                <input placeholder="URL audio" value={a.url}
                  onChange={(e) => setForm({ ...form, audios: updateAt(form.audios, i, { url: e.target.value }) })} />
                <input type="file" accept="audio/*" onChange={(e) => onAudioFileChange(i, e)}
                  disabled={recordingIndex !== null} />
                {recordingIndex === i ? (
                  <button type="button" className="danger" onClick={stopRecording}>⏹ Arrêter</button>
                ) : (
                  <button type="button" className="ghost" onClick={() => startRecording(i)}
                    disabled={recordingIndex !== null}>
                    🎙 {pending ? "Réenregistrer" : "Enregistrer"}
                  </button>
                )}
                <input placeholder="Locuteur" value={a.speaker ?? ""}
                  onChange={(e) => setForm({ ...form, audios: updateAt(form.audios, i, { speaker: e.target.value }) })} />
                <button type="button" className="danger" onClick={() => removeAudioRow(i)}>✕</button>
                {previewSrc && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", marginTop: 6 }}>
                    <audio controls src={previewSrc} style={{ height: 32 }} />
                    <button type="button" className="ghost"
                      onClick={() => {
                        setPendingAudio(i, undefined);
                        setForm({ ...form, audios: updateAt(form.audios, i, { url: "" }) });
                      }}>
                      Supprimer l'audio
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" className="ghost"
            onClick={() => {
              setForm({ ...form, audios: [...form.audios, { url: "" }] });
              setPendingAudios((p) => [...p, undefined]);
            }}>
            + Ajouter un audio
          </button>
        </div>

        {submit.isError && <p className="error">Enregistrement impossible (terme déjà utilisé ?).</p>}
        <button type="submit" disabled={
          !form.term.trim() || submit.isPending || uploadingImage || recordingIndex !== null
        }>
          {submit.isPending ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Publier le mot"}
        </button>
      </form>
    </AdminLayout>
  );
}
