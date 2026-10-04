import { api } from "./client";
import type {
  BatchItemResult, ChatMessage, ChatResponse, ImportImage, ImportResponse, Lang, MessageCreate, SmartCheckResponse,
  WordCreate, WordDetail, WordSummary,
} from "./types";

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
  // Analyse par l'IA (texte + captures) : nettement plus long qu'un appel classique.
  importExtract: (body: { text: string; images: ImportImage[] }) =>
    api.post<ImportResponse>("/contributions/import/extract", body, { timeout: 180000 }).then((r) => r.data),
  proposeBatch: (entries: WordCreate[]) =>
    api.post<BatchItemResult[]>("/contributions/batch", { entries }).then((r) => r.data),
};

export const AssistantApi = {
  // Plusieurs allers-retours avec Claude (+ réveil éventuel de Render) : timeout plus large.
  chat: (messages: ChatMessage[]) =>
    api.post<ChatResponse>("/assistant/chat", { messages }, { timeout: 90000 }).then((r) => r.data),
};

export const MessagesApi = {
  send: (body: MessageCreate) => api.post("/messages", body).then((r) => r.data),
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
