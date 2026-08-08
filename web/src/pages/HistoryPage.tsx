import { useHistory } from "../store/history";
import { WordListItem } from "../components/WordListItem";

export default function HistoryPage() {
  const items = useHistory((s) => s.items);
  const clear = useHistory((s) => s.clear);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 20, marginTop: 0 }}>Historique</h1>
        {items.length > 0 && <button className="ghost" onClick={clear}>Vider l'historique</button>}
      </div>
      {items.length === 0 ? (
        <p className="empty-state">Aucun mot consulté pour l'instant.</p>
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
