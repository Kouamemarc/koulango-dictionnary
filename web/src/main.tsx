import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App.tsx";

registerSW({ immediate: true });

const DAY = 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 7 * DAY, // garde les données assez longtemps pour survivre à une coupure
      // Hors ligne : on sert ce qui est en cache au lieu de rester bloqué en « chargement ».
      networkMode: "offlineFirst",
    },
  },
});

// localStorage peut être indisponible (navigation privée, stockage bloqué) : le site
// fonctionne alors normalement, simplement sans mode hors ligne.
function safeStorage(): Storage | undefined {
  try {
    const probe = "__koulango_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const persister = createSyncStoragePersister({ storage: safeStorage(), key: "koulango-query-cache" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 7 * DAY,
        // Comme l'app mobile : on ne garde que la liste des mots et les fiches déjà consultées
        // (pas les recherches ponctuelles), c'est ce qu'on veut retrouver hors ligne.
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            if (!defaultShouldDehydrateQuery(query)) return false;
            const [scope, sub] = query.queryKey as [string, string?];
            return scope === "word" || (scope === "words" && sub === "list");
          },
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>
);
