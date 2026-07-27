export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type UserRole = "utilisateur" | "moderateur" | "administrateur";

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string | null;
  role: UserRole;
  is_active: boolean;
}

export interface PendingContribution {
  contribution_id: number;
  word_id: number | null;
  term: string;
  fr_translation: string | null;
  en_translation: string | null;
  created_at: string;
}

export type WordStatus = "EN_ATTENTE_VALIDATION" | "PUBLIE" | "REFUSE" | "FUSIONNE";

export interface WordSummary {
  id: number;
  term: string;
  fr_translation: string | null;
  image_url: string | null;
  status: WordStatus;
}

export type TranslationLang = "fr" | "en";
export interface Translation { id?: number; language: TranslationLang; text: string; example?: string | null; example_translation?: string | null; }
export interface Definition { id?: number; text: string; }
export interface Example { id?: number; sentence: string; translation?: string | null; }
export interface Pronunciation { id?: number; ipa?: string | null; phonetic?: string | null; }
export interface Audio { id?: number; url: string; duration_ms?: number | null; speaker?: string | null; }

export interface WordDetail {
  id: number;
  term: string;
  fr_translation: string | null;
  en_translation: string | null;
  part_of_speech: string | null;
  source: string | null;
  image_url: string | null;
  status: WordStatus;
  dialect_id: number | null;
  translations: Translation[];
  definitions: Definition[];
  examples: Example[];
  pronunciations: Pronunciation[];
  audios: Audio[];
}

/** Ajout direct (publié immédiatement) : mêmes champs simples que la contribution mobile. */
export interface WordCreate {
  term: string;
  fr_translation?: string;
  en_translation?: string;
  part_of_speech?: string;
  definition?: string;
  example?: string;
  example_translation?: string;
  pronunciation?: string;
  audio_url?: string;
  image_url?: string;
  source?: string;
  translations?: Translation[];
}

/** Édition complète : champs + remplacement des sous-entités. */
export interface WordEdit {
  term: string;
  fr_translation: string | null;
  en_translation: string | null;
  part_of_speech: string | null;
  source: string | null;
  image_url: string | null;
  translations: Translation[];
  definitions: Definition[];
  examples: Example[];
  pronunciations: Pronunciation[];
  audios: Audio[];
}
