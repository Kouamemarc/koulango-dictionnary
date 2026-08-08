import { Link } from "react-router-dom";
import { useFavorites } from "../store/favorites";
import { HeartIcon } from "./Icons";
import type { Lang, WordSummary } from "../api/types";

export function WordListItem({ item, lang = "koulango" }: { item: WordSummary; lang?: Lang }) {
  const isFavorite = useFavorites((s) => s.isFavorite(item.id));
  const toggleFavorite = useFavorites((s) => s.toggle);

  const showFrFirst = lang === "francais" && !!item.fr_translation;
  const headline = showFrFirst ? item.fr_translation : item.term;
  const secondary = showFrFirst ? item.term : item.fr_translation;

  return (
    <li>
      <Link to={`/mots/${item.id}`} className="word-row">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="word-thumb" />
        ) : (
          <div className="word-thumb">{(headline ?? "?").charAt(0).toUpperCase()}</div>
        )}
        <div className="word-row-main">
          <div className="word-row-term">
            <strong>{headline}</strong>
            {item.part_of_speech ? <span className="word-row-pos">({item.part_of_speech})</span> : null}
          </div>
          {secondary ? <div className="word-row-secondary">{secondary}</div> : null}
        </div>
        <button
          className="heart-btn"
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(item);
          }}
          aria-label="Favori"
        >
          <HeartIcon filled={isFavorite} />
        </button>
      </Link>
    </li>
  );
}
