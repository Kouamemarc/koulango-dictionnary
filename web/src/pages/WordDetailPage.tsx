import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { WordsApi } from "../api/endpoints";
import { useFavorites } from "../store/favorites";
import { useHistory } from "../store/history";
import { HeartIcon, VolumeIcon, ShareIcon, ChevronIcon } from "../components/Icons";
import type { Definition, Example, Translation, WordDetail, WordSummary } from "../api/types";
import { useOnlineStatus } from "../useOnlineStatus";

/** Fiche minimale tirée de la liste des mots (gardée sur l'appareil), pour l'affichage hors ligne. */
function fromSummary(w: WordSummary): WordDetail {
  return {
    id: w.id, term: w.term, fr_translation: w.fr_translation ?? null, en_translation: null,
    part_of_speech: w.part_of_speech ?? null, source: null, image_url: w.image_url ?? null, status: w.status,
    dialect_id: null, translations: [], pronunciations: [],
    definitions: w.definition ? [{ id: 0, text: w.definition }] : [],
    examples: w.example ? [{ id: 0, sentence: w.example, translation: null }] : [],
    audios: w.audio_url ? [{ id: 0, url: w.audio_url }] : [],
  };
}

/** Surligne l'occurrence du mot/expression dans une phrase d'exemple. */
function highlighted(sentence: string, term: string) {
  const idx = sentence.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return sentence;
  return (
    <>
      {sentence.slice(0, idx)}
      <span className="highlight">{sentence.slice(idx, idx + term.length)}</span>
      {sentence.slice(idx + term.length)}
    </>
  );
}

export default function WordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const wordId = Number(id);
  const [showMore, setShowMore] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const online = useOnlineStatus();
  const { data: fullWord } = useQuery({
    queryKey: ["word", wordId],
    queryFn: () => WordsApi.detail(wordId),
  });
  // Lecture seule du cache de la liste (aucun appel réseau) ; se met à jour quand le cache
  // gardé sur l'appareil est rechargé au démarrage.
  const { data: list } = useQuery({ queryKey: ["words", "list"], queryFn: WordsApi.list, enabled: false });
  // Fiche jamais ouverte : on affiche tout de suite l'essentiel connu par la liste des mots
  // (indispensable hors ligne), remplacé par la fiche complète dès qu'elle arrive.
  const word = useMemo(() => {
    if (fullWord) return fullWord;
    const summary = list?.find((w) => w.id === wordId);
    return summary ? fromSummary(summary) : undefined;
  }, [fullWord, list, wordId]);

  const isFavorite = useFavorites((s) => (word ? s.isFavorite(word.id) : false));
  const toggleFavorite = useFavorites((s) => s.toggle);
  const record = useHistory((s) => s.record);

  useEffect(() => {
    if (word) {
      record({ id: word.id, term: word.term, fr_translation: word.fr_translation, image_url: word.image_url, status: word.status });
    }
  }, [word]);

  const playAudio = () => {
    if (!word?.audios.length) return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = word.audios[0].url;
    audioRef.current.play().catch(() => {});
  };

  const shareWord = async () => {
    if (!word) return;
    const parts = [word.part_of_speech ? `${word.term} (${word.part_of_speech})` : word.term];
    if (word.fr_translation) parts.push(`Français : ${word.fr_translation}`);
    if (word.definitions[0]) parts.push(word.definitions[0].text);
    const text = parts.join("\n");
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: word.term, text, url });
      } catch {
        // partage annulé
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("Lien copié dans le presse-papiers.");
    }
  };

  if (!word) {
    return (
      <p className="empty-state">
        {online ? "Chargement…" : "Ce mot n'est pas disponible hors ligne. Reconnectez-vous pour l'afficher."}
      </p>
    );
  }

  const hasAudio = word.audios.length > 0;
  const firstDefinition = word.definitions[0];
  const firstExample = word.examples[0];
  const hasMore = word.translations.length > 0 || word.definitions.length > 1 || word.examples.length > 1;

  return (
    <>
      {word.image_url ? <img src={word.image_url} alt="" className="illustration" /> : null}

      <div className="word-card">
        <div className="word-card-top">
          <div>
            <h1>{word.term}</h1>
            {word.part_of_speech ? <p className="pos">({word.part_of_speech})</p> : null}
          </div>
          <button className="icon-btn" onClick={playAudio} disabled={!hasAudio} aria-label="Écouter">
            <VolumeIcon color={hasAudio ? "var(--primary)" : "var(--border)"} />
          </button>
        </div>

        {firstDefinition ? <p className="definition">{firstDefinition.text}</p> : null}

        {word.fr_translation ? (
          <>
            <div className="divider" />
            <div className="word-card-top">
              <p className="secondary">
                <b>Français : </b>
                {word.fr_translation}
              </p>
              <button className="icon-btn" onClick={playAudio} disabled={!hasAudio} aria-label="Écouter">
                <VolumeIcon size={18} color={hasAudio ? "var(--primary)" : "var(--border)"} />
              </button>
            </div>
            {firstExample ? (
              <>
                <span className="note">{highlighted(firstExample.sentence, word.term)}</span>
                {firstExample.translation ? <span className="note">{firstExample.translation}</span> : null}
              </>
            ) : null}
          </>
        ) : null}

        <div className="word-card-footer">
          <div className="word-card-actions">
            <button
              className="icon-btn"
              onClick={() =>
                toggleFavorite({ id: word.id, term: word.term, fr_translation: word.fr_translation, image_url: word.image_url, status: word.status })
              }
              aria-label="Favori"
            >
              <HeartIcon filled={isFavorite} color="var(--favorite)" />
            </button>
            <button className="icon-btn" onClick={shareWord} aria-label="Partager">
              <ShareIcon size={20} color="var(--primary-dark)" />
            </button>
          </div>
          {hasMore && (
            <button className="ghost" onClick={() => setShowMore((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {showMore ? "Voir moins" : "Voir plus"}
              <ChevronIcon size={14} up={showMore} />
            </button>
          )}
        </div>
      </div>

      {showMore && (
        <>
          {word.translations.length > 0 && (
            <div className="more-section">
              <h3>Autres traductions</h3>
              {word.translations.map((t: Translation) => (
                <div className="sub-card" key={t.id}>
                  <div>
                    <span className="lang-tag">{t.language.toUpperCase()}</span>
                    <span className="definition">{t.text}</span>
                  </div>
                  {t.example ? (
                    <>
                      <span className="note">{highlighted(t.example, word.term)}</span>
                      {t.example_translation ? <span className="note">{t.example_translation}</span> : null}
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {word.definitions.length > 1 && (
            <div className="more-section">
              <h3>Autres définitions</h3>
              {word.definitions.slice(1).map((d: Definition) => (
                <div className="sub-card" key={d.id}>
                  <span className="definition">{d.text}</span>
                </div>
              ))}
            </div>
          )}
          {word.examples.length > 1 && (
            <div className="more-section">
              <h3>Autres exemples</h3>
              {word.examples.slice(1).map((e: Example) => (
                <div className="sub-card" key={e.id}>
                  <span className="definition">{highlighted(e.sentence, word.term)}</span>
                  {e.translation ? <span className="pos">{e.translation}</span> : null}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {word.en_translation ? <p className="footer-info">Traduction anglaise : {word.en_translation}</p> : null}
      {word.source ? <p className="footer-info italic">Ajouté par : {word.source}</p> : null}
    </>
  );
}
