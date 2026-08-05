"use client";

import { useState } from "react";
import type { ReactNode } from "react";

/**
 * 챕터 말미 확인 질문 (KICKOFF §4.2, DESIGN §4.3).
 * 채점·입력 없음 — 탭하면 답이 펼쳐진다. 부담 최소화가 목적.
 */
export function CheckQuestion({
  answer,
  children,
}: {
  answer: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="my-8 rounded-card border border-hairline bg-sheet p-5">
      <p className="text-caption font-semibold text-ink-600">확인 질문</p>
      <div className="mt-2 text-body text-ink-900">{children}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 rounded-ctl border border-hairline-strong bg-transparent px-3 py-1.5 text-sm-token text-ink-600 transition-colors duration-(--dur-micro) hover:bg-inset"
      >
        {open ? "답 닫기" : "답 보기"}
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-(--dur-ui)"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="pt-3 text-body text-ink-900">{answer}</p>
        </div>
      </div>
    </section>
  );
}
