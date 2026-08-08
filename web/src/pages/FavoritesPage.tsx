import { useFavorites } from "../store/favorites";
import { WordListItem } from "../components/WordListItem";

export default function FavoritesPage() {
  const items = useFavorites((s) => s.items);

  return (
    <>
      <h1 style={{ fontSize: 20, marginTop: 0 }}>Favoris</h1>
      {items.length === 0 ? (
        <p className="empty-state">Aucun favori pour l'instant.</p>
      ) : (
        <ul className="word-list">
          {items.map((item) => (
            <WordListItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}
