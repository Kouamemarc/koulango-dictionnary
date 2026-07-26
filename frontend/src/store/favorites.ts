/** Favoris locaux à l'appareil : aucun compte requis, persistés hors-ligne. */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WordSummary } from "@/types";

interface FavoritesState {
  items: WordSummary[];
  isFavorite: (id: number) => boolean;
  toggle: (word: WordSummary) => void;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      isFavorite: (id) => get().items.some((w) => w.id === id),
      toggle: (word) =>
        set((s) => {
          const exists = s.items.some((w) => w.id === word.id);
          return { items: exists ? s.items.filter((w) => w.id !== word.id) : [word, ...s.items] };
        }),
    }),
    { name: "koulango.favorites", storage: createJSONStorage(() => AsyncStorage) }
  )
);
