import { api } from "./client";
import type { PendingContribution, TokenPair, User } from "./types";

export const AuthApi = {
  login: (email: string, password: string) =>
    api.post<TokenPair>("/auth/login", { email, password }).then((r) => r.data),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
};

export const AdminApi = {
  pending: () => api.get<PendingContribution[]>("/admin/pending").then((r) => r.data),
  review: (contributionId: number, decision: "accepte" | "refuse", reason?: string) =>
    api.post(`/admin/contributions/${contributionId}/review`, { decision, reason }).then((r) => r.data),
};
