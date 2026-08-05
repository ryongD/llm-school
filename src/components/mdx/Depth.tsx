"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * 깊이 토글 카드 (KICKOFF §4.2, DESIGN §4.2).
 * - 접힘이 기본. 열림 상태는 URL 해시(#dev-1)로 공유 가능, 해시 진입 시 자동 열림.
 * - 좌측 3px 수직 룰: dev = 쪽빛 500, research = ink-400.
 * - 라벨은 텍스트+선 아이콘(셰브론)만 — 이모지 금지(DESIGN §1.3-3).
 */

const LABEL: Record<"dev" | "research", string> = {
  dev: "개발자 레이어 — 수식과 코드",
  research: "연구 레이어 — 원문과 논쟁",
};

export function Depth({
  level,
  hint,
  children,
}: {
  level: "dev" | "research";
  /** 1-1 전용 한 줄 안내 (DESIGN §4.2 — 이후 챕터에서 반복하지 않음) */
  hint?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [anchorId, setAnchorId] = useState<string | undefined>(undefined);
  const rootRef = useRef<HTMLElement>(null);

  // 문서 내 등장 순서로 안정적인 앵커 id(#dev-1, #research-1 …)를 부여하고,
  // 해시로 진입한 경우 자동 열림 + 스크롤.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const sameLevel = Array.from(
      document.querySelectorAll(`[data-depth-level="${level}"]`),
    );
    const id = `${level}-${sameLevel.indexOf(el) + 1}`;
    setAnchorId(id);
    el.id = id;
    if (window.location.hash === `#${id}`) {
      setOpen(true);
      requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    }
  }, [level]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (!anchorId) return;
    // 공유 가능한 열림 상태 — 열면 해시 기록, 닫으면 우리 해시만 제거
    if (next) {
      history.replaceState(null, "", `#${anchorId}`);
    } else if (window.location.hash === `#${anchorId}`) {
      history.replaceState(null, "", window.location.pathname);
    }
  }

  const ruleColor = level === "dev" ? "var(--jjok-500)" : "var(--ink-400)";

  return (
    <section
      ref={rootRef}
      data-depth-level={level}
      className="my-6 rounded-card border border-hairline bg-inset"
      style={{ borderLeft: `3px solid ${ruleColor}` }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm-token font-semibold text-ink-900">
          {LABEL[level]}
        </span>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
          className={`shrink-0 text-ink-600 transition-transform duration-(--dur-micro) ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {hint && !open ? (
        <p className="px-4 pb-3 text-caption text-ink-400">{hint}</p>
      ) : null}
      <div
        className="grid transition-[grid-template-rows] duration-(--dur-ui)"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="prose-depth px-4 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
