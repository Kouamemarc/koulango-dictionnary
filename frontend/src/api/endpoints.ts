/** Fonctions d'appel de l'API, typées. */
import { api } from "./client";
import type { SmartCheckResponse, WordCreate, WordDetail, WordSummary } from "@/types";

export const WordsApi = {
  list: () => api.get<WordSummary[]>("/words").then((r) => r.data),
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

export const MediaApi = {
  upload: (asset: { uri: string; mimeType?: string | null; fileName?: string | null }) => {
    const formData = new FormData();
    // React Native accepte cette forme spéciale (uri/name/type) pour un upload multipart.
    formData.append("file", {
      uri: asset.uri,
      name: asset.fileName ?? "image.jpg",
      type: asset.mimeType ?? "image/jpeg",
    } as unknown as Blob);
    return api
      .post<{ url: string }>("/media", formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },
};
