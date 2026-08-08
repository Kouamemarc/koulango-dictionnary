/** Historique de consultation local au navigateur : aucun compte requis. */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { WordSummary } from "../api/types";

const MAX_ITEMS = 50;

interface HistoryState {
  items: WordSummary[];
  record: (word: WordSummary) => void;
  clear: () => void;
}

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      items: [],
      record: (word) =>
        set((s) => ({ items: [word, ...s.items.filter((w) => w.id !== word.id)].slice(0, MAX_ITEMS) })),
      clear: () => set({ items: [] }),
    }),
    { name: "koulango.history", storage: createJSONStorage(() => localStorage) }
  )
);
