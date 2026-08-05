"use client";

import { useEffect, useRef, useState } from "react";

/**
 * FactValue의 클라이언트 부분 (DESIGN §4.7).
 * 인라인 수치 + 미세한 점선 하단 표시. 탭 시 "검증일 · 출처" 툴팁.
 * 본문 흐름을 해치지 않는 최소 장치.
 */
export function FactValueChip({
  display,
  tooltip,
}: {
  display: string;
  tooltip: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

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
    <span ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="cursor-help border-b border-dotted border-ink-400 text-inherit tabular"
      >
        {display}
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute bottom-full left-0 z-(--z-popover) mb-1 block w-max max-w-[280px] rounded-ctl border border-hairline bg-sheet px-2 py-1 text-caption text-ink-600 shadow-pop"
        >
          {tooltip}
        </span>
      ) : null}
    </span>
  );
}
