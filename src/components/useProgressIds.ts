"use client";

import { useEffect, useState } from "react";

import { getProgress, PROGRESS_EVENT } from "@/lib/progress";

/**
 * 읽은 챕터 id 집합 구독 훅.
 * SSR 시엔 빈 집합(ready=false) — 마운트 후 localStorage에서 읽고,
 * 같은 탭(커스텀 이벤트)·다른 탭(storage 이벤트) 갱신을 반영한다.
 */
export function useProgressIds(): { readIds: Set<string>; ready: boolean } {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function refresh() {
      setReadIds(new Set(Object.keys(getProgress())));
    }
    refresh();
    setReady(true);
    window.addEventListener(PROGRESS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return { readIds, ready };
}
