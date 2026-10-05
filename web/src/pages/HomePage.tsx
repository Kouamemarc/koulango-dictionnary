import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { WordsApi } from "../api/endpoints";
import { WordListItem } from "../components/WordListItem";
import { SearchIcon, MicIcon, SwapIcon, ChevronIcon, ChatIcon } from "../components/Icons";
import type { Lang, WordSummary } from "../api/types";
import { useOnlineStatus } from "../useOnlineStatus";

/** Minuscules sans accents, pour comparer « dígô » et « digo ». */
const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export default function HomePage() {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<Lang>("koulango");
  const isSearching = q.length >= 1;

  // Sans saisie : liste alphabétique complète des mots publiés (accueil).
  const online = useOnlineStatus();
  // Toujours chargée (et gardée sur l'appareil) : sert aussi à chercher hors ligne.
  const list = useQuery({ queryKey: ["words", "list"], queryFn: WordsApi.list });
  // Dès la première lettre : recherche instantanée bidirectionnelle (koulango <-> français).
  const search = useQuery({
    queryKey: ["words", "search", q, lang],
    queryFn: () => WordsApi.search(q, lang),
    enabled: isSearching,
  });

  // Hors ligne (ou API injoignable) : recherche dans les mots enregistrés sur l'appareil.
  const offlineSearch = isSearching && (!online || search.isError) && !!list.data;
  const localResults = useMemo<WordSummary[]>(() => {
    if (!offlineSearch) return [];
    const needle = fold(q);
    return list.data!.filter((w) => fold(w.term).includes(needle) || fold(w.fr_translation ?? "").includes(needle));
  }, [offlineSearch, q, list.data]);

  const { data, isLoading } = offlineSearch
    ? { data: localResults, isLoading: false }
    : isSearching ? search : list;

  // Un mot par jour, identique pour tout le monde (index déterministe basé sur
  // la date, pas un tirage aléatoire par visiteur). Reste affiché depuis le
  // cache même pendant une recherche (la requête "list" n'est plus refetchée
  // mais garde ses dernières données).
  const wordOfDay = useMemo(() => {
    if (!list.data || list.data.length === 0) return null;
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return list.data[dayIndex % list.data.length];
  }, [list.data]);

  return (
    <>
      {!isSearching && wordOfDay && (
        <Link to={`/mots/${wordOfDay.id}`} className="word-of-day">
          <div>
            <div className="word-of-day-label">✨ Mot du jour</div>
            <div className="word-of-day-term">
              {wordOfDay.term}
              {wordOfDay.part_of_speech ? <span className="pos"> ({wordOfDay.part_of_speech})</span> : null}
            </div>
            {wordOfDay.fr_translation ? <div className="word-of-day-translation">{wordOfDay.fr_translation}</div> : null}
          </div>
          <ChevronIcon color="#fff" />
        </Link>
      )}

      <div className="search-bar">
        <SearchIcon size={18} />
        <input
          placeholder="Rechercher un mot…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <MicIcon size={18} />
      </div>

      <div className="lang-toggle">
        <span className={lang === "francais" ? "active" : ""}>Français</span>
        <button onClick={() => setLang((l) => (l === "koulango" ? "francais" : "koulango"))} aria-label="Inverser">
          <SwapIcon size={18} color="#fff" />
        </button>
        <span className={lang === "koulango" ? "active" : ""}>Koulango</span>
      </div>

      {isLoading && <p className="empty-state">Chargement…</p>}
      {!isLoading && (data ?? []).length === 0 && (
        offlineSearch ? (
          <p className="empty-state">
            Aucun résultat pour « {q.trim()} » parmi les mots enregistrés sur cet appareil.
            <br />
            Reconnectez-vous pour chercher dans tout le dictionnaire.
          </p>
        ) : isSearching ? (
          // Mot introuvable : on propose directement de l'ajouter, guidé par l'assistant.
          <div className="missing-word">
            <p>
              « {q.trim()} » n'est pas encore dans le dictionnaire.
              <br />
              Vous le connaissez ? Aidez-nous à l'ajouter !
            </p>
            <Link
              to={`/assistant?${new URLSearchParams({ terme: q.trim(), langue: lang })}`}
              className="missing-word-cta"
            >
              <ChatIcon size={18} />
              Ajouter ce mot avec l'assistant
            </Link>
            <Link to="/contribuer" className="missing-word-alt">ou remplir le formulaire</Link>
          </div>
        ) : (
          <p className="empty-state">Aucun mot publié pour l'instant.</p>
        )
      )}
      {offlineSearch && localResults.length > 0 && (
        <p className="hint offline-hint">Recherche hors ligne parmi les mots enregistrés sur cet appareil.</p>
      )}
      <ul className="word-list">
        {(data ?? []).map((item) => (
          <WordListItem key={item.id} item={item} lang={lang} />
        ))}
      </ul>
    </>
  );
}
