"use client";
import { useEffect, useRef, useState } from "react";

export type SessionExitAction = "refresh" | "restart";

/** Native refresh/close uses beforeunload; page keyboard shortcuts get our friendly dialog. */
export function useSessionGuard(hasWork: boolean) {
  const [action, setAction] = useState<SessionExitAction | null>(null);
  const allowUnload = useRef(false);

  useEffect(() => {
    if (!hasWork) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (allowUnload.current) return;
      event.preventDefault();
      // Browsers display their own message; custom beforeunload text is not supported.
      event.returnValue = "";
    };
    const refreshShortcut = (event: KeyboardEvent) => {
      const refresh =
        event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) &&
          !event.altKey &&
          event.key.toLowerCase() === "r");
      if (!refresh || event.defaultPrevented || event.repeat) return;
      event.preventDefault();
      setAction("refresh");
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("keydown", refreshShortcut);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("keydown", refreshShortcut);
    };
  }, [hasWork]);

  return {
    action,
    request: (next: SessionExitAction) => setAction(next),
    cancel: () => setAction(null),
    refresh: () => {
      allowUnload.current = true;
      window.location.reload();
    },
  };
}
