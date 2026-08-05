"use client";

import { useState } from "react";

/**
 * 인주 도장 모션 데모 (DESIGN §1.2·§9-2).
 * 찍힘: –5° 미세 회전 + 220ms 스케일 다운 1회.
 * 스탬프 내부 글리프는 D9 결정 대기 — 임시로 추상 인장(원+점)을 쓴다.
 * prefers-reduced-motion 시 즉시 찍힘(전역 규칙이 처리).
 */
export function StampDemo() {
  const [stamped, setStamped] = useState(false);
  const [key, setKey] = useState(0);

  function replay() {
    setStamped(false);
    requestAnimationFrame(() => {
      setKey((k) => k + 1);
      setStamped(true);
    });
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex h-24 w-40 items-center justify-center rounded-card border border-hairline bg-sheet">
        <span className="text-sm-token text-ink-600">챕터 카드</span>
        {stamped ? (
          <svg
            key={key}
            viewBox="0 0 40 40"
            width="36"
            height="36"
            aria-label="완독 도장"
            className="stamp-in absolute -top-2 -right-2 text-inju-500"
          >
            <circle
              cx="20"
              cy="20"
              r="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle cx="20" cy="20" r="7" fill="currentColor" />
          </svg>
        ) : null}
      </div>
      <button
        type="button"
        onClick={replay}
        className="rounded-ctl border border-hairline-strong px-3 py-1.5 text-sm-token text-ink-600 hover:bg-inset"
      >
        도장 모션 재생
      </button>
    </div>
  );
}
