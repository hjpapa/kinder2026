"use client";

import { useEffect, useRef } from "react";
import { writeStorage } from "@/lib/client-storage";

export function useAutoDraft<T>(kind: string, data: T, enabled: boolean) {
  const initial = useRef(JSON.stringify(data));
  useEffect(() => {
    if (!enabled) return;
    const serialized = JSON.stringify(data);
    if (serialized === initial.current) return;
    const timer = window.setTimeout(() => writeStorage(`${kind}-autosave`, data), 700);
    return () => window.clearTimeout(timer);
  }, [data, enabled, kind]);
}
