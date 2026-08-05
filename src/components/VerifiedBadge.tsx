"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 검증 배지 (DESIGN §4.5 — 신뢰 UI의 핵심 2, 인주 도장 시그니처 연동).
 * Refs 아래 고정. 90일 초과 시 도장이 회색으로 바래고 "재검증 예정" 표기 —
 * 신선도를 정직하게 노출하는 것이 신뢰다.
 */

const STALE_DAYS = 90;

function daysSince(iso: string): number {
  const then = new Date(`${iso}T00:00:00`).getTime();
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

/** 소형 인주 도장 아이콘 — 원형 인장 모티프, 14px (인주색은 도장 전용 §1.3-6) */
function SealIcon({ faded }: { faded: boolean }) {
  return (
    <svg
      viewBox="0 0 14 14"
      width="14"
      height="14"
      aria-hidden="true"
      className={faded ? "text-ink-400" : "text-inju-500"}
    >
      <circle
        cx="7"
        cy="7"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="7" cy="7" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function VerifiedBadge({
  principleDate,
  factsDate,
}: {
  /** 원리 설명 검증일 (frontmatter lastVerified) */
  principleDate: string;
  /** 수치 데이터 검증일 (사용한 facts 파일의 _meta.lastVerified) */
  factsDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [stale, setStale] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 신선도 판정은 클라이언트에서 — 정적 빌드 시점에 고정되지 않게 한다
  useEffect(() => {
    setStale(daysSince(principleDate) > STALE_DAYS);
  }, [principleDate]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 text-caption text-ink-600"
      >
        <SealIcon faded={stale} />
        <span>
          원리 검증 {principleDate}
          {factsDate ? ` · 수치 데이터 검증 ${factsDate}` : null}
          {stale ? " · 재검증 예정" : null}
        </span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="검증 프로세스 안내"
          className="absolute bottom-full left-0 z-(--z-popover) mb-1 w-max max-w-[300px] rounded-card border border-hairline bg-sheet p-3 text-caption leading-relaxed text-ink-600 shadow-pop"
        >
          모든 챕터는 스펙 확정 → 원문 근거 초안 → 별도 세션 교차 검증 → 테스트
          → 사람 최종 승인의 5게이트를 통과해야 공개됩니다. 오류를 발견하셨다면
          제보해 주세요(챕터 하단 링크 — 준비 중).
        </div>
      ) : null}
    </div>
  );
}
