import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminApi, WordsApi } from "../api/endpoints";
import { AdminLayout } from "../components/AdminLayout";
import type { Audio, Definition, Example, Pronunciation } from "../api/types";

interface FormState {
  term: string;
  fr_translation: string;
  en_translation: string;
  source: string;
  image_url: string;
  definitions: Definition[];
  examples: Example[];
  pronunciations: Pronunciation[];
  audios: Audio[];
}

const EMPTY: FormState = {
  term: "", fr_translation: "", en_translation: "", source: "", image_url: "",
  definitions: [], examples: [], pronunciations: [], audios: [],
};

function updateAt<T>(list: T[], i: number, patch: Partial<T>): T[] {
  return list.map((item, idx) => (idx === i ? { ...item, ...patch } : item));
}

export default function WordFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);

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
        source: existing.source ?? "",
        image_url: existing.image_url ?? "",
        definitions: existing.definitions,
        examples: existing.examples,
        pronunciations: existing.pronunciations,
        audios: existing.audios,
      });
    }
  }, [existing]);

  const submit = useMutation({
    mutationFn: async () => {
      const editPayload = {
        term: form.term,
        fr_translation: form.fr_translation || null,
        en_translation: form.en_translation || null,
        source: form.source || null,
        image_url: form.image_url || null,
        definitions: form.definitions,
        examples: form.examples,
        pronunciations: form.pronunciations,
        audios: form.audios,
      };
      if (isEdit) return AdminApi.updateWord(Number(id), editPayload);

      const created = await AdminApi.createWord({
        term: form.term,
        fr_translation: form.fr_translation || undefined,
        en_translation: form.en_translation || undefined,
        source: form.source || undefined,
        image_url: form.image_url || undefined,
        definition: form.definitions[0]?.text,
        example: form.examples[0]?.sentence,
        pronunciation: form.pronunciations[0]?.phonetic ?? form.pronunciations[0]?.ipa ?? undefined,
        audio_url: form.audios[0]?.url,
      });
      const hasExtra =
        form.definitions.length > 1 || form.examples.length > 1 ||
        form.pronunciations.length > 1 || form.audios.length > 1;
      return hasExtra ? AdminApi.updateWord(created.id, editPayload) : created;
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
          <label>URL image (illustration)</label>
          <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
        <div className="field">
          <label>Source</label>
          <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </div>

        <div className="subentity-block">
          <h3>Définitions</h3>
          {form.definitions.map((d, i) => (
            <div className="subentity-row" key={i}>
              <input placeholder="Texte" value={d.text}
                onChange={(e) => setForm({ ...form, definitions: updateAt(form.definitions, i, { text: e.target.value }) })} />
              <input placeholder="Nature (nom, verbe…)" value={d.part_of_speech ?? ""}
                onChange={(e) => setForm({ ...form, definitions: updateAt(form.definitions, i, { part_of_speech: e.target.value }) })} />
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
          {form.audios.map((a, i) => (
            <div className="subentity-row" key={i}>
              <input placeholder="URL audio" value={a.url}
                onChange={(e) => setForm({ ...form, audios: updateAt(form.audios, i, { url: e.target.value }) })} />
              <input placeholder="Locuteur" value={a.speaker ?? ""}
                onChange={(e) => setForm({ ...form, audios: updateAt(form.audios, i, { speaker: e.target.value }) })} />
              <button type="button" className="danger"
                onClick={() => setForm({ ...form, audios: form.audios.filter((_, idx) => idx !== i) })}>✕</button>
            </div>
          ))}
          <button type="button" className="ghost"
            onClick={() => setForm({ ...form, audios: [...form.audios, { url: "" }] })}>
            + Ajouter un audio
          </button>
        </div>

        {submit.isError && <p className="error">Enregistrement impossible (terme déjà utilisé ?).</p>}
        <button type="submit" disabled={!form.term.trim() || submit.isPending}>
          {submit.isPending ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Publier le mot"}
        </button>
      </form>
    </AdminLayout>
  );
}
