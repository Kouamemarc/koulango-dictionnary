import { useEffect } from "react";

/** Même nom que le cache d'images du service worker (vite.config.ts → runtimeCaching). */
const CACHE_NAME = "koulango-images";
const MAX_IMAGES = 300;

/**
 * Met en cache les illustrations des mots dès que la liste est connue, pour qu'elles
 * s'affichent hors ligne même si elles n'ont jamais été vues (le service worker, lui,
 * ne garde que les images affichées après son installation).
 */
export function useOfflineImages(urls: (string | null | undefined)[] | undefined) {
  useEffect(() => {
    if (!urls?.length || typeof caches === "undefined" || !navigator.onLine) return;
    const wanted = [...new Set(urls.filter((u): u is string => !!u))].slice(0, MAX_IMAGES);
    let cancelled = false;

    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        for (const url of wanted) {
          if (cancelled) return;
          if (await cache.match(url)) continue;
          // CORS d'abord (réponse lisible), sinon « no-cors » (réponse opaque, affichable quand même).
          const res = await fetch(url, { mode: "cors" }).catch(() => fetch(url, { mode: "no-cors" }));
          if (res.ok || res.type === "opaque") await cache.put(url, res);
        }
      } catch {
        // Hors ligne, quota plein, navigation privée… : sans gravité, on réessaiera plus tard.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urls]);
}
