import { api } from "./client";
import type {
  PendingContribution, TokenPair, User, WordCreate, WordDetail, WordEdit, WordSummary,
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
};
