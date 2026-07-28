import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

import RootNavigator from "@/navigation";

const DAY = 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 7 * DAY, // garde les données en cache assez longtemps pour survivre à une coupure
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "koulango-query-cache",
});

export default function App() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 7 * DAY,
          // Ne persiste que la liste des mots et les fiches déjà consultées
          // (pas les recherches ponctuelles) : c'est ce qu'on veut retrouver
          // hors-ligne au lancement, avant que le backend Render (qui se met
          // en veille) ne réponde à nouveau.
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              if (!defaultShouldDehydrateQuery(query)) return false;
              const [scope, sub] = query.queryKey as [string, string?];
              return scope === "word" || (scope === "words" && sub === "list");
            },
          },
        }}
      >
        <StatusBar style="auto" />
        <RootNavigator />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
