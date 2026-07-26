import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminApi, WordsApi } from "../api/endpoints";
import { AdminLayout } from "../components/AdminLayout";

const STATUS_LABEL: Record<string, string> = {
  PUBLIE: "Publié",
  EN_ATTENTE_VALIDATION: "En attente",
  REFUSE: "Refusé",
  FUSIONNE: "Fusionné",
};

export default function WordsPage() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const isSearching = q.trim().length > 0;

  const { data, isLoading } = useQuery({
    queryKey: ["words", isSearching ? "search" : "list", q],
    queryFn: () => (isSearching ? WordsApi.search(q) : WordsApi.list()),
  });

  const remove = useMutation({
    mutationFn: (id: number) => AdminApi.deleteWord(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["words"] }),
  });

  return (
    <AdminLayout title="Mots">
      <div className="field">
        <input placeholder="Rechercher un mot…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading && <p>Chargement…</p>}
      {!isLoading && data?.length === 0 && <p className="muted">Aucun mot trouvé.</p>}

      <ul className="word-list">
        {data?.map((w) => (
          <li key={w.id} className="word-card">
            <div>
              <strong>{w.term}</strong>
              {w.fr_translation && <span className="muted"> — {w.fr_translation}</span>}
              <span className="badge">{STATUS_LABEL[w.status] ?? w.status}</span>
            </div>
            <div className="actions">
              <Link to={`/words/${w.id}/edit`}><button className="ghost">Modifier</button></Link>
              <button
                className="danger"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`Supprimer « ${w.term} » définitivement ?`)) remove.mutate(w.id);
                }}
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AdminLayout>
  );
}
