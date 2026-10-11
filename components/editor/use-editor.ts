"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { commit, undo, redo, type History } from "@/lib/history";
import {
  getImages,
  imageSources,
  loadProject,
  saveProject,
  storageError,
} from "@/lib/storage";
import type { AssetSources, BookDocument, ImageAsset } from "@/lib/document";

export type SaveStatus =
  "Modifications en cours" | "Enregistré" | "Échec de sauvegarde";
export function useBookEditor(id: string) {
  const [history, setHistory] = useState<History | null>(null),
    [sources, setSources] = useState<AssetSources>({}),
    [images, setImages] = useState<ImageAsset[]>([]),
    [error, setError] = useState(""),
    [status, setStatus] = useState<SaveStatus>("Enregistré"),
    [loaded, setLoaded] = useState(false);
  const latest = useRef<BookDocument | null>(null),
    queue = useRef<Promise<void>>(Promise.resolve());
  const historySnapshot = useRef<History | null>(null),
    group = useRef<History | null>(null);
  useEffect(() => {
    historySnapshot.current = history;
  }, [history]);
  useEffect(() => {
    let alive = true;
    loadProject(id)
      .then(async (doc) => {
        if (!doc)
          throw new Error(
            "Ce carnet n’est pas enregistré dans ce navigateur. Revenez à l’accueil ou importez une copie du projet.",
          );
        const assets = await getImages(doc),
          urls = await imageSources(assets);
        if (alive) {
          latest.current = doc;
          setHistory({ past: [], present: doc, future: [] });
          setImages(assets);
          setSources(urls);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(storageError(e));
          setLoaded(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [id]);
  const persist = useCallback(async (doc: BookDocument) => {
    const revision = doc.updatedAt;
    const task = queue.current.catch(() => {}).then(() => saveProject(doc));
    queue.current = task;
    try {
      await task;
      if (latest.current?.updatedAt === revision) setStatus("Enregistré");
    } catch (e) {
      setStatus("Échec de sauvegarde");
      setError(storageError(e));
      throw e;
    }
  }, []);
  useEffect(() => {
    if (!history || status === "Enregistré") return;
    latest.current = history.present;
    const timer = setTimeout(() => {
      void persist(history.present).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [history, persist, status]);
  useEffect(
    () => () => {
      if (latest.current) void persist(latest.current).catch(() => {});
    },
    [persist],
  );
  useEffect(() => {
    const save = () => {
      if (latest.current) void persist(latest.current).catch(() => {});
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", visibility);
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (status !== "Enregistré") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [persist, status]);
  const update = useCallback(
    (transform: (doc: BookDocument) => BookDocument) => {
      const base = group.current;
      setStatus("Modifications en cours");
      setHistory((h) => (h ? commit(base ?? h, transform(h.present)) : h));
    },
    [],
  );
  // A text session is one document operation. Tiptap keeps its own typing history.
  const beginGroup = useCallback(() => {
    group.current = historySnapshot.current;
  }, []);
  const endGroup = useCallback(() => {
    group.current = null;
  }, []);
  const cancelGroup = useCallback(() => {
    const base = group.current;
    group.current = null;
    if (base) {
      setStatus("Modifications en cours");
      setHistory({
        ...base,
        present: { ...base.present, updatedAt: new Date().toISOString() },
      });
    }
  }, []);
  const goUndo = useCallback(() => {
    setStatus("Modifications en cours");
    setHistory((h) => (h ? undo(h) : h));
  }, []);
  const goRedo = useCallback(() => {
    setStatus("Modifications en cours");
    setHistory((h) => (h ? redo(h) : h));
  }, []);
  const flush = async () => {
    if (latest.current) await persist(latest.current);
  };
  return {
    doc: history?.present,
    canUndo: !!history?.past.length,
    canRedo: !!history?.future.length,
    update,
    beginGroup,
    endGroup,
    cancelGroup,
    undo: goUndo,
    redo: goRedo,
    sources,
    setSources,
    images,
    setImages,
    status,
    error,
    setError,
    loaded,
    flush,
  };
}
