/** Types partagés avec l'API backend. */

export type Lang = "koulango" | "francais";

export type WordStatus =
  | "EN_ATTENTE_VALIDATION"
  | "PUBLIE"
  | "REFUSE"
  | "FUSIONNE";

export interface WordSummary {
  id: number;
  term: string;
  fr_translation?: string | null;
  image_url?: string | null;
  part_of_speech?: string | null;
  definition?: string | null;
  example?: string | null;
  audio_url?: string | null;
  status: WordStatus;
}

export type TranslationLang = "fr" | "en";
export interface Translation { id: number; language: TranslationLang; text: string; example?: string | null; example_translation?: string | null; }
export interface Definition { id: number; text: string; }
export interface Example { id: number; sentence: string; translation?: string | null; }
export interface Pronunciation { id: number; ipa?: string | null; phonetic?: string | null; }
export interface Audio { id: number; url: string; duration_ms?: number | null; speaker?: string | null; }

export interface WordDetail {
  id: number;
  term: string;
  fr_translation?: string | null;
  en_translation?: string | null;
  part_of_speech?: string | null;
  source?: string | null;
  image_url?: string | null;
  status: WordStatus;
  dialect_id?: number | null;
  translations: Translation[];
  definitions: Definition[];
  examples: Example[];
  pronunciations: Pronunciation[];
  audios: Audio[];
}

export interface Suggestion {
  word_id: number;
  term: string;
  similarity: number;
  distance: number;
}

export interface SmartCheckResponse {
  exists: boolean;
  message: string;
  suggestions: Suggestion[];
}

export interface WordCreate {
  term: string;
  fr_translation?: string;
  en_translation?: string;
  part_of_speech?: string;
  definition?: string;
  example?: string;
  example_translation?: string;
  dialect_id?: number;
  pronunciation?: string;
  audio_url?: string;
  image_url?: string;
  source?: string;
  translations?: { language: TranslationLang; text: string; example?: string; example_translation?: string }[];
  force_create?: boolean;
}
