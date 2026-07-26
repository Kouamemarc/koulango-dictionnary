/** Fonctions d'appel de l'API, typées. */
import { api } from "./client";
import type {
  SmartCheckResponse, TokenPair, User, WordCreate, WordDetail, WordSummary,
} from "@/types";

export const AuthApi = {
  register: (body: { email: string; username: string; password: string; full_name?: string }) =>
    api.post<User>("/auth/register", body).then((r) => r.data),
  login: (body: { email: string; password: string }) =>
    api.post<TokenPair>("/auth/login", body).then((r) => r.data),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
};

export const WordsApi = {
  search: (q: string) =>
    api.get<WordSummary[]>("/words/search", { params: { q } }).then((r) => r.data),
  detail: (id: number) => api.get<WordDetail>(`/words/${id}`).then((r) => r.data),
};

export const ContributionsApi = {
  check: (term: string) =>
    api.get<SmartCheckResponse>("/contributions/check", { params: { term } }).then((r) => r.data),
  propose: (body: WordCreate) =>
    api.post<WordSummary>("/contributions", body).then((r) => r.data),
};

export const MeApi = {
  favorites: () => api.get<WordSummary[]>("/me/favorites").then((r) => r.data),
  addFavorite: (id: number) => api.post(`/me/favorites/${id}`).then((r) => r.data),
  removeFavorite: (id: number) => api.delete(`/me/favorites/${id}`),
  history: () => api.get<string[]>("/me/history").then((r) => r.data),
};

export const AdminApi = {
  pending: () => api.get<WordSummary[]>("/admin/pending").then((r) => r.data),
  review: (contributionId: number, decision: "accepte" | "refuse", reason?: string) =>
    api.post(`/admin/contributions/${contributionId}/review`, { decision, reason }).then((r) => r.data),
  deleteWord: (id: number) => api.delete(`/admin/words/${id}`),
};
