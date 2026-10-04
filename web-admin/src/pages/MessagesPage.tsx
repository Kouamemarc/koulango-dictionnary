import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminApi } from "../api/endpoints";
import { AdminLayout } from "../components/AdminLayout";

const KIND_LABEL = { contact: "Contact", moderateur: "Candidature modérateur" } as const;

export default function MessagesPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "messages"], queryFn: AdminApi.messages });

  const markRead = useMutation({
    mutationFn: ({ id, read }: { id: number; read: boolean }) => AdminApi.markMessageRead(id, read),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "messages"] }),
  });

  return (
    <AdminLayout title="Messages des visiteurs" subtitle="Contacts et candidatures pour devenir modérateur">
      {isLoading && <p>Chargement…</p>}
      {error && <p className="error">Impossible de charger les messages.</p>}
      {!isLoading && !error && data?.length === 0 && <p className="muted">Aucun message pour l'instant.</p>}

      <ul className="contrib-list">
        {data?.map((m) => (
          <li key={m.id} className={`message-card${m.is_read ? " message-read" : ""}`}>
            <div className="message-head">
              <span className={`badge ${m.kind === "moderateur" ? "badge-new" : ""}`}>{KIND_LABEL[m.kind]}</span>
              {!m.is_read && <span className="badge badge-similar">Nouveau</span>}
              <span className="muted">{new Date(m.created_at).toLocaleString("fr-FR")}</span>
            </div>
            <p className="message-body">{m.body}</p>
            <dl className="message-meta">
              <div><dt>Nom</dt><dd>{m.name || "—"}</dd></div>
              <div><dt>Contact</dt><dd>{m.contact || "—"}</dd></div>
              {m.kind === "moderateur" && (
                <>
                  <div><dt>Ville / région</dt><dd>{m.region || "—"}</dd></div>
                  <div><dt>Niveau</dt><dd>{m.koulango_level || "—"}</dd></div>
                </>
              )}
            </dl>
            <div className="actions">
              <button
                className="ghost"
                disabled={markRead.isPending}
                onClick={() => markRead.mutate({ id: m.id, read: !m.is_read })}
              >
                {m.is_read ? "Marquer non lu" : "Marquer comme lu"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AdminLayout>
  );
}
