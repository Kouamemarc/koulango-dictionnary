import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminApi } from "../api/endpoints";
import { AdminLayout } from "../components/AdminLayout";

export default function PendingPage() {
  const qc = useQueryClient();
  const [reasonFor, setReasonFor] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: AdminApi.pending,
  });

  const review = useMutation({
    mutationFn: ({ id, decision, reason }: { id: number; decision: "accepte" | "refuse"; reason?: string }) =>
      AdminApi.review(id, decision, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "pending"] });
      setReasonFor(null);
      setReason("");
    },
  });

  const isForbidden = (error as { response?: { status?: number } } | null)?.response?.status === 403;

  return (
    <AdminLayout title="Contributions en attente">
      {isLoading && <p>Chargement…</p>}
      {isForbidden && <p className="error">Ton compte n'a pas les privilèges de modération.</p>}
      {!isLoading && !error && data?.length === 0 && <p className="muted">Rien à valider. 🎉</p>}

      <ul className="contrib-list">
        {data?.map((c) => (
          <li key={c.contribution_id} className="contrib-card">
            <div>
              <strong>{c.term}</strong>
              {c.fr_translation && <span className="muted"> — {c.fr_translation}</span>}
            </div>
            {reasonFor === c.contribution_id ? (
              <div className="reason-row">
                <input
                  placeholder="Motif du refus"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoFocus
                />
                <button
                  className="danger"
                  disabled={!reason.trim() || review.isPending}
                  onClick={() => review.mutate({ id: c.contribution_id, decision: "refuse", reason })}
                >
                  Confirmer le refus
                </button>
                <button className="ghost" onClick={() => setReasonFor(null)}>Annuler</button>
              </div>
            ) : (
              <div className="actions">
                <button
                  disabled={review.isPending}
                  onClick={() => review.mutate({ id: c.contribution_id, decision: "accepte" })}
                >
                  Accepter
                </button>
                <button className="danger" disabled={review.isPending} onClick={() => setReasonFor(c.contribution_id)}>
                  Refuser
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </AdminLayout>
  );
}
