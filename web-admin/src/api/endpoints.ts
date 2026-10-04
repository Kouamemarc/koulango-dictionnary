import { api } from "./client";
import type {
  ImportImage, ImportResponse, PendingContribution, TokenPair, User, VisitorMessage, WordCreate, WordDetail, WordEdit,
  WordSummary,
} from "./types";

export const AuthApi = {
  login: (email: string, password: string) =>
    api.post<TokenPair>("/auth/login", { email, password }).then((r) => r.data),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
};

export const WordsApi = {
  list: () => api.get<WordSummary[]>("/words").then((r) => r.data),
  search: (q: string) => api.get<WordSummary[]>("/words/search", { params: { q } }).then((r) => r.data),
  detail: (id: number) => api.get<WordDetail>(`/words/${id}`).then((r) => r.data),
};

export const AdminApi = {
  pending: () => api.get<PendingContribution[]>("/admin/pending").then((r) => r.data),
  review: (contributionId: number, decision: "accepte" | "refuse", reason?: string) =>
    api.post(`/admin/contributions/${contributionId}/review`, { decision, reason }).then((r) => r.data),
  createWord: (body: WordCreate) => api.post<WordDetail>("/admin/words", body).then((r) => r.data),
  updateWord: (id: number, body: WordEdit) => api.put<WordDetail>(`/admin/words/${id}`, body).then((r) => r.data),
  deleteWord: (id: number) => api.delete(`/admin/words/${id}`),
  messages: () => api.get<VisitorMessage[]>("/admin/messages").then((r) => r.data),
  markMessageRead: (id: number, read: boolean) =>
    api.post<VisitorMessage>(`/admin/messages/${id}/read`, null, { params: { read } }).then((r) => r.data),
  // Analyse par l'IA (texte + images) : nettement plus long qu'un appel classique.
  importExtract: (body: { text: string; images: ImportImage[] }) =>
    api.post<ImportResponse>("/admin/import/extract", body, { timeout: 180000 }).then((r) => r.data),
};

export const MediaApi = {
  upload: (file: File | Blob, filename = "audio.webm") => {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append("file", file);
    } else {
      formData.append("file", file, filename);
    }
    return api
      .post<{ url: string }>("/media", formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },
};
