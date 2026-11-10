import { useCallback, useEffect, useState } from "react";

/**
 * Restaurant choisi sur le site (`?lieu=<id>`), partagé entre Carte, Envies et Lieux.
 *
 * La source de vérité reste l'URL. Ce hook lit l'URL au montage puis reste
 * synchronisé via l'événement `texas:lieu` et `popstate`.
 */
export const LIEU_EVENT = "texas:lieu";

function readLieuFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("lieu");
  } catch {
    return null;
  }
}

export function setLieu(id: string) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("lieu", id);
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new CustomEvent(LIEU_EVENT, { detail: id }));
  } catch {
    // Sans URL complète : on ignore.
  }
}

export function useLieu(defaultId: string | null = null) {
  const [lieu, setLieuState] = useState<string | null>(() => readLieuFromUrl() ?? defaultId);

  useEffect(() => {
    const fromUrl = readLieuFromUrl();
    if (fromUrl) setLieuState(fromUrl);
    else if (defaultId) setLieuState(defaultId);
  }, [defaultId]);

  useEffect(() => {
    const onPop = () => setLieuState(readLieuFromUrl());
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setLieuState(detail);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener(LIEU_EVENT, onCustom as EventListener);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener(LIEU_EVENT, onCustom as EventListener);
    };
  }, []);

  const choose = useCallback((id: string) => {
    setLieuState(id);
    setLieu(id);
  }, []);

  return { lieu, choose } as const;
}
