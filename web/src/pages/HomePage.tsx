import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WordsApi } from "../api/endpoints";
import { WordListItem } from "../components/WordListItem";
import { SearchIcon, MicIcon, SwapIcon } from "../components/Icons";
import type { Lang } from "../api/types";

export default function HomePage() {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<Lang>("koulango");
  const isSearching = q.length >= 1;

  // Sans saisie : liste alphabétique complète des mots publiés (accueil).
  const list = useQuery({ queryKey: ["words", "list"], queryFn: WordsApi.list, enabled: !isSearching });
  // Dès la première lettre : recherche instantanée bidirectionnelle (koulango <-> français).
  const search = useQuery({
    queryKey: ["words", "search", q, lang],
    queryFn: () => WordsApi.search(q, lang),
    enabled: isSearching,
  });

  const { data, isLoading } = isSearching ? search : list;

  return (
    <>
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
        <p className="empty-state">
          {isSearching ? `Aucun résultat pour « ${q} ».` : "Aucun mot publié pour l'instant."}
        </p>
      )}
      <ul className="word-list">
        {(data ?? []).map((item) => (
          <WordListItem key={item.id} item={item} lang={lang} />
        ))}
      </ul>
    </>
  );
}
