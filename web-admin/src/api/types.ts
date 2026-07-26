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
