"use client";
import { useEffect, useRef, useState } from "react";
import type { StudioSnapshot } from "@/types/studio";
import {
  clearDraft,
  draftError,
  readDraft,
  restoreDraft,
  saveDraft,
  type DraftRecord,
} from "@/lib/draftStorage";
import { disposePhoto } from "@/lib/imageLoader";

export type DraftStatus = "checking" | "unsaved" | "saving" | "saved" | "error";
export function useLocalDraft(
  snapshot: StudioSnapshot,
  hasWork: boolean,
  onRestore: (snapshot: StudioSnapshot) => void,
) {
  const [phase, setPhase] = useState<
    "checking" | "prompt" | "restoring" | "ready" | "clearing"
  >("checking");
  const [status, setStatus] = useState<DraftStatus>("checking");
  const [record, setRecord] = useState<DraftRecord | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const current = useRef({ snapshot, hasWork, phase });
  current.current = { snapshot, hasWork, phase };
  const revision = useRef<string | null>(null),
    generation = useRef(0),
    epoch = useRef(0),
    alive = useRef(true),
    canSave = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSnapshot = useRef<StudioSnapshot | null>(null);
  const flushRef = useRef<() => Promise<boolean>>(async () => false);
  useEffect(() => {
    alive.current = true;
    let active = true;
    readDraft()
      .then((saved) => {
        if (!active) return;
        revision.current = saved?.revision ?? null;
        setRecord(saved);
        setUpdatedAt(saved?.updatedAt ?? null);
        setPhase(saved ? "prompt" : "ready");
        setStatus(saved ? "saved" : "unsaved");
      })
      .catch((failure) => {
        if (!active) return;
        canSave.current = false;
        setError(draftError(failure));
        setStatus("error");
        setPhase("ready");
      });
    return () => {
      active = false;
      alive.current = false;
      epoch.current++;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const flush = async (): Promise<boolean> => {
    const data = current.current;
    if (data.phase !== "ready" || !canSave.current) return false;
    if (savedSnapshot.current === data.snapshot) return true;
    if (!data.hasWork && !revision.current) return true;
    if (timer.current) clearTimeout(timer.current);
    const version = generation.current,
      operation = epoch.current;
    setStatus("saving");
    try {
      if (!data.hasWork) {
        await clearDraft(() => revision.current);
        revision.current = null;
        if (!alive.current || epoch.current !== operation) return false;
        savedSnapshot.current = data.snapshot;
        setUpdatedAt(null);
        setError("");
        setStatus("saved");
        return true;
      }
      const saved = await saveDraft(data.snapshot, () => revision.current);
      // Update the expected revision even when newer edits arrived during this save.
      revision.current = saved.revision;
      savedSnapshot.current = data.snapshot;
      if (!alive.current || epoch.current !== operation) return false;
      setUpdatedAt(saved.updatedAt);
      setError("");
      setStatus(generation.current === version ? "saved" : "unsaved");
      return generation.current === version;
    } catch (failure) {
      if (alive.current && epoch.current === operation) {
        setError(draftError(failure));
        setStatus("error");
      }
      return false;
    }
  };
  flushRef.current = flush;
  useEffect(() => {
    generation.current++;
    if (
      phase !== "ready" ||
      (!hasWork && !revision.current) ||
      !canSave.current
    )
      return;
    setStatus("unsaved");
    timer.current = setTimeout(() => {
      void flushRef.current();
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [snapshot, hasWork, phase]);
  useEffect(() => {
    const hide = () => {
      if (
        document.visibilityState === "hidden" &&
        current.current.phase === "ready" &&
        (current.current.hasWork || !!revision.current)
      )
        void flushRef.current();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  const restore = async () => {
    if (!record || phase === "restoring") return;
    const operation = epoch.current;
    setPhase("restoring");
    setError("");
    setProgress({ current: 0, total: 0 });
    try {
      const saved = await restoreDraft(record, (current, total) => {
        if (alive.current) setProgress({ current, total });
      });
      if (!alive.current || operation !== epoch.current) {
        saved.photos.forEach(disposePhoto);
        Object.values(saved.themeImages)
          .flat()
          .forEach((image) => disposePhoto(image.photo));
        return;
      }
      onRestore(saved);
      setRecord(null);
      setPhase("ready");
      setStatus("saved");
    } catch (failure) {
      if (alive.current) {
        setError(draftError(failure));
        setPhase("prompt");
      }
    }
  };
  const discard = async () => {
    epoch.current++;
    if (timer.current) clearTimeout(timer.current);
    setPhase("clearing");
    try {
      await clearDraft(canSave.current ? () => revision.current : undefined);
      revision.current = null;
      savedSnapshot.current = null;
      canSave.current = true;
      setRecord(null);
      setError("");
      setUpdatedAt(null);
      setStatus("unsaved");
      setPhase("ready");
      return true;
    } catch (failure) {
      if (!record && !revision.current && !canSave.current) {
        setPhase("ready");
        return true;
      }
      setError(draftError(failure));
      setStatus("error");
      setPhase(record ? "prompt" : "ready");
      return false;
    }
  };
  const retry = async () => {
    if (!canSave.current) {
      try {
        const existing = await readDraft();
        revision.current = existing?.revision ?? null;
        if (existing) {
          setRecord(existing);
          setPhase("prompt");
          return;
        }
        canSave.current = true;
      } catch (failure) {
        setError(draftError(failure));
        return;
      }
    }
    await flushRef.current();
  };
  return {
    phase,
    status:
      status === "saved" &&
      phase === "ready" &&
      savedSnapshot.current !== snapshot &&
      (hasWork || !!revision.current)
        ? ("unsaved" as const)
        : status,
    updatedAt,
    record,
    error,
    progress,
    restore,
    discard,
    retry,
    saveNow: flush,
    blocked: phase !== "ready",
    needsProtection:
      phase === "ready" &&
      (hasWork || !!revision.current) &&
      (status !== "saved" || savedSnapshot.current !== snapshot),
  };
}
