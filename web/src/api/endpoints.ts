import { api } from "./client";
import type { Lang, SmartCheckResponse, WordCreate, WordDetail, WordSummary } from "./types";

export const WordsApi = {
  list: () => api.get<WordSummary[]>("/words").then((r) => r.data),
  search: (q: string, lang: Lang = "koulango") =>
    api.get<WordSummary[]>("/words/search", { params: { q, lang } }).then((r) => r.data),
  detail: (id: number) => api.get<WordDetail>(`/words/${id}`).then((r) => r.data),
};

export const ContributionsApi = {
  check: (term: string) =>
    api.get<SmartCheckResponse>("/contributions/check", { params: { term } }).then((r) => r.data),
  propose: (body: WordCreate) => api.post<WordSummary>("/contributions", body).then((r) => r.data),
};

export const MediaApi = {
  upload: (file: File | Blob, filename = "media") => {
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
