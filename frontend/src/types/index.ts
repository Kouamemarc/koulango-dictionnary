/** Types partagés avec l'API backend. */

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
  status: WordStatus;
}

export interface Definition { id: number; text: string; part_of_speech?: string | null; }
export interface Example { id: number; sentence: string; translation?: string | null; }
export interface Pronunciation { id: number; ipa?: string | null; phonetic?: string | null; }
export interface Audio { id: number; url: string; duration_ms?: number | null; speaker?: string | null; }

export interface WordDetail {
  id: number;
  term: string;
  fr_translation?: string | null;
  en_translation?: string | null;
  source?: string | null;
  image_url?: string | null;
  status: WordStatus;
  dialect_id?: number | null;
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
  expression?: string;
  fr_translation?: string;
  en_translation?: string;
  definition?: string;
  example?: string;
  dialect_id?: number;
  pronunciation?: string;
  audio_url?: string;
  image_url?: string;
  source?: string;
  force_create?: boolean;
}
