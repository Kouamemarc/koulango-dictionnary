import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AssistantApi, ContributionsApi, MediaApi } from "../api/endpoints";
import { SendIcon } from "../components/Icons";
import { ConsentCheckbox } from "../components/ConsentCheckbox";
import type { ChatMessage, Suggestion, WordCreate } from "../api/types";

const GREETING = "Bonjour ! Quel mot ou quelle expression koulango voulez-vous ajouter ?";

/** Premier message envoyé automatiquement quand on arrive depuis une recherche sans résultat. */
function initialMessage(term: string, lang: string | null): string {
  return lang === "francais"
    ? `J'ai cherché « ${term} » en français mais le dictionnaire n'a pas de résultat. Je voudrais ajouter le mot koulango qui correspond.`
    : `Je voudrais ajouter le mot koulango « ${term} » au dictionnaire.`;
}

const DRAFT_FIELDS: [keyof WordCreate, string][] = [
  ["fr_translation", "Français"],
  ["en_translation", "Anglais"],
  ["part_of_speech", "Nature"],
  ["definition", "Définition"],
  ["example", "Exemple"],
  ["example_translation", "Traduction de l'exemple"],
  ["pronunciation", "Prononciation"],
  ["source", "Proposé par"],
];

/** Audio enregistré/choisi localement, envoyé au serveur seulement avec la proposition. */
interface PendingAudio {
  blob: Blob;
  name: string;
  previewUrl: string;
  /** URL renvoyée par le serveur une fois envoyé (évite un second envoi si on réessaie). */
  uploadedUrl?: string;
}

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "similar"; suggestions: Suggestion[] }
  | { kind: "error"; message: string }
  | { kind: "sent" };

export default function AssistantPage() {
  const [params] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [draft, setDraft] = useState<WordCreate | null>(null);
  const [sendState, setSendState] = useState<SendState>({ kind: "idle" });
  const [consent, setConsent] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking, draft, sendState]);

  const send = async (text: string, history: ChatMessage[] = messages) => {
    const next: ChatMessage[] = [...history, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setChatError(null);
    setThinking(true);
    try {
      const res = await AssistantApi.chat(next);
      setMessages([...next, { role: "assistant", content: res.reply }]);
      if (res.draft) {
        setDraft(res.draft);
        setSendState({ kind: "idle" });
      }
    } catch (e: any) {
      // On retire le message non traité et on le remet dans le champ pour pouvoir réessayer.
      setMessages(history);
      setInput(text);
      const detail = e?.response?.data?.detail;
      setChatError(
        e?.response?.status === 422
          ? "La conversation est devenue trop longue. Recommencez avec un nouveau mot."
          : typeof detail === "string" ? detail : "L'assistant ne répond pas. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setThinking(false);
    }
  };

  // Arrivée depuis une recherche sans résultat : la conversation démarre toute seule.
  useEffect(() => {
    const term = params.get("terme")?.trim();
    if (!term || startedRef.current) return;
    startedRef.current = true;
    send(initialMessage(term, params.get("langue")), []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    send(text);
  };

  const replacePendingAudio = (next: PendingAudio | null) => {
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
        replacePendingAudio({ blob, name: "prononciation.webm", previewUrl: URL.createObjectURL(blob) });
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
    replacePendingAudio({ blob: file, name: file.name, previewUrl: URL.createObjectURL(file) });
  };

  const playPendingAudio = () => {
    if (!pendingAudio) return;
    if (!audioPlayerRef.current) audioPlayerRef.current = new Audio();
    audioPlayerRef.current.src = pendingAudio.previewUrl;
    audioPlayerRef.current.play().catch(() => {});
  };

  const onImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const { url } = await MediaApi.upload(file);
      setImageUrl(url);
    } catch {
      alert("Envoi de l'image impossible.");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const submitDraft = async (force: boolean) => {
    if (!draft) return;
    setSendState({ kind: "sending" });
    try {
      let audio_url = pendingAudio?.uploadedUrl;
      if (pendingAudio && !audio_url) {
        try {
          audio_url = (await MediaApi.upload(pendingAudio.blob, pendingAudio.name)).url;
          setPendingAudio({ ...pendingAudio, uploadedUrl: audio_url });
        } catch {
          setSendState({ kind: "error", message: "Envoi de l'audio impossible. Réessayez ou supprimez-le." });
          return;
        }
      }
      await ContributionsApi.propose({
        ...draft,
        audio_url,
        image_url: imageUrl ?? undefined,
        force_create: force || draft.force_create,
        ai_consent: consent,
      });
      setSendState({ kind: "sent" });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 409 && detail?.suggestions?.length) {
        setSendState({ kind: "similar", suggestions: detail.suggestions });
      } else {
        setSendState({ kind: "error", message: typeof detail === "string" ? detail : "Envoi impossible. Réessayez." });
      }
    }
  };

  const restart = () => {
    setMessages([]);
    setDraft(null);
    replacePendingAudio(null);
    setImageUrl(null);
    setImagePreview(null);
    setSendState({ kind: "idle" });
    setChatError(null);
    setInput("");
  };

  const sent = sendState.kind === "sent";
  const mediaBusy = isRecording || uploadingImage;

  return (
    <div className="assistant">
      <div className="assistant-intro">
        <h1>Assistant d'ajout</h1>
        <p>
          Répondez simplement aux questions, l'assistant prépare la fiche pour vous.{" "}
          <Link to="/contribuer">Préférer le formulaire</Link>
        </p>
      </div>

      <div className="chat">
        <div className="bubble bot">{GREETING}</div>
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role === "user" ? "user" : "bot"}`}>{m.content}</div>
        ))}
        {thinking && <div className="bubble bot typing" aria-label="L'assistant écrit"><span /><span /><span /></div>}

        {draft && (
          <div className="draft-card">
            <div className="draft-label">Récapitulatif de la proposition</div>
            <div className="draft-term">{draft.term}</div>
            <dl>
              {DRAFT_FIELDS.filter(([k]) => draft[k]).map(([k, label]) => (
                <div key={k}>
                  <dt>{label}</dt>
                  <dd>{String(draft[k])}</dd>
                </div>
              ))}
              {(draft.translations ?? []).length > 0 && (
                <div>
                  <dt>Autres sens</dt>
                  <dd>{draft.translations!.map((t) => `${t.text} (${t.language.toUpperCase()})`).join(", ")}</dd>
                </div>
              )}
            </dl>

            {!sent && (
              <div className="draft-media">
                <div className="draft-media-head">
                  <span>Prononciation audio et illustration</span>
                  <span className="badge">Recommandé</span>
                </div>
                <p className="hint">Facultatif, mais cela aide beaucoup ceux qui découvrent le mot.</p>

                {pendingAudio && !isRecording && (
                  <div className="audio-preview">
                    <button type="button" className="ghost" onClick={playPendingAudio}>▶ Écouter</button>
                    <button type="button" className="danger" onClick={() => replacePendingAudio(null)}>Supprimer</button>
                  </div>
                )}
                <div className="media-row" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className={isRecording ? "danger" : "ghost"}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? "Arrêter l'enregistrement" : pendingAudio ? "Réenregistrer" : "🎤 Enregistrer"}
                  </button>
                  <label className="file-btn">
                    Fichier audio
                    <input type="file" accept="audio/*" onChange={onAudioFileChange} disabled={isRecording} hidden />
                  </label>
                </div>

                <div className="draft-image">
                  {imagePreview && <img src={imagePreview} alt="" className="image-preview" />}
                  <label className="file-btn">
                    {uploadingImage ? "Envoi…" : imagePreview ? "Changer l'image" : "🖼️ Choisir une image"}
                    <input type="file" accept="image/*" onChange={onImageChange} disabled={uploadingImage} hidden />
                  </label>
                </div>
              </div>
            )}

            {sent ? (
              <div className="draft-done">
                <p>Merci ❤️ Votre proposition a été envoyée. Elle sera vérifiée par un modérateur avant publication.</p>
                <div className="draft-actions">
                  <button onClick={restart}>Ajouter un autre mot</button>
                  <Link to="/" className="ghost-link">Retour à l'accueil</Link>
                </div>
              </div>
            ) : sendState.kind === "similar" ? (
              <div className="draft-warning">
                <p>
                  Des mots proches existent déjà : <b>{sendState.suggestions.map((s) => s.term).join(", ")}</b>.
                  Est-ce bien un mot différent ?
                </p>
                <div className="draft-actions">
                  <button onClick={() => submitDraft(true)}>Oui, c'est un autre mot</button>
                  <button className="ghost" onClick={() => setSendState({ kind: "idle" })}>Non, annuler</button>
                </div>
              </div>
            ) : (
              <>
                {sendState.kind === "error" && <p className="chat-error">{sendState.message}</p>}
                <ConsentCheckbox checked={consent} onChange={setConsent} />
                <button className="draft-send" onClick={() => submitDraft(false)} disabled={sendState.kind === "sending" || thinking || mediaBusy || !consent}>
                  {sendState.kind === "sending" ? "Envoi…" : "Envoyer la proposition"}
                </button>
                <p className="hint">Une erreur ? Écrivez à l'assistant ce qu'il faut corriger.</p>
              </>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {chatError && <p className="chat-error">{chatError}</p>}

      {!sent && (
        <form className="chat-input" onSubmit={onSubmit}>
          <input
            placeholder="Votre réponse…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            autoFocus
          />
          <button type="submit" aria-label="Envoyer" disabled={thinking || !input.trim()}>
            <SendIcon size={18} />
          </button>
        </form>
      )}
    </div>
  );
}
