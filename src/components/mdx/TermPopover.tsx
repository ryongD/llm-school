"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * 용어 팝오버 (DESIGN §4.1) — 클라이언트 부분.
 * 점선 밑줄(링크의 실선·쪽빛과 명확히 구분), 탭/클릭·Enter로 열림, Esc·바깥 클릭 닫힘.
 * 1차 궁금증은 이 자리에서 해소하고(페이지 이탈 없음), 상세 이동은 선택(§7.1).
 */
export function TermPopover({
  term,
  oneLiner,
  detailHref,
  learn,
  children,
}: {
  term: string;
  oneLiner: string;
  detailHref: string;
  /** "본문에서 배우기 → 2-1" 크로스링크 (§7.1) */
  learn?: { label: string; href: string };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="cursor-help border-b border-dotted border-ink-400 text-inherit"
      >
        {children}
      </button>
      {open ? (
        <span
          role="dialog"
          aria-label={`용어: ${term}`}
          className="absolute top-full left-0 z-(--z-popover) mt-1 block w-max max-w-[280px] rounded-card border border-hairline bg-sheet p-3 shadow-pop"
        >
          <span className="block font-semibold text-ink-900">{term}</span>
          <span className="mt-1 block text-sm-token text-ink-600">
            {oneLiner}
          </span>
          <span className="mt-2 flex flex-wrap gap-3">
            <Link
              href={detailHref}
              className="text-caption text-jjok-600 underline underline-offset-2"
            >
              자세히 →
            </Link>
            {learn ? (
              <Link
                href={learn.href}
                className="text-caption text-jjok-600 underline underline-offset-2"
              >
                {learn.label}
              </Link>
            ) : null}
          </span>
        </span>
      ) : null}
    </span>
  );
}
