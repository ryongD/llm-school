"use client";

import { useRef, useState } from "react";

import { toggleCollect } from "@/lib/collect";

/** 사이트 버전 — 채집 모드 진입점을 겸한다 (KICKOFF §4.7) */
const SITE_VERSION = "v0.1.0";
const TAP_TARGET = 7;
const TAP_WINDOW_MS = 4000;

/**
 * 전역 푸터. 버전 표기를 7연타하면 채집 모드가 토글된다(§4.7 — 재성 전용
 * 숨은 진입, 독자에게는 평범한 버전 표기로만 보인다).
 */
export function SiteFooter() {
  const taps = useRef<{ count: number; first: number }>({ count: 0, first: 0 });
  const [notice, setNotice] = useState("");

  function onVersionTap() {
    const now = Date.now();
    if (now - taps.current.first > TAP_WINDOW_MS) {
      taps.current = { count: 0, first: now };
    }
    taps.current.count += 1;
    if (taps.current.count >= TAP_TARGET) {
      taps.current = { count: 0, first: 0 };
      const on = toggleCollect();
      setNotice(on ? "채집 모드 켜짐" : "채집 모드 꺼짐");
      setTimeout(() => setNotice(""), 2200);
    }
  }

  return (
    <footer className="mx-auto max-w-content px-5 pt-16 pb-8">
      <p className="text-caption text-ink-400">
        llm-school (가칭) ·{" "}
        <button
          type="button"
          onClick={onVersionTap}
          aria-label="사이트 버전"
          className="cursor-default text-ink-400"
        >
          {SITE_VERSION}
        </button>
        {notice ? (
          <span role="status" className="ml-2 text-jjok-600">
            {notice}
          </span>
        ) : null}
      </p>
    </footer>
  );
}
