"use client";

import Link from "next/link";

import { pickNextUnread } from "@/lib/progress";
import { useProgressIds } from "@/components/useProgressIds";

/**
 * 이어가기 카드 (DESIGN §6.2-1) — 재방문자 전용, 히어로보다 위.
 * 두 번째 방문부터 홈의 임무는 소개가 아니라 복귀다.
 * 첫 방문자(진도 없음)에게는 렌더되지 않는다.
 * 진행률은 "n/공개 챕터 수" — 담백한 텍스트(게이지·퍼센트 링 금지 §4.8).
 */
export function ContinueCard({
  chapters,
}: {
  chapters: { id: string; title: string; permalink: string }[];
}) {
  const { readIds, ready } = useProgressIds();

  const readCount = chapters.filter((c) => readIds.has(c.id)).length;
  if (!ready || readCount === 0) return null;

  const next = pickNextUnread(chapters, readIds);
  const total = chapters.length;

  if (!next) {
    return (
      <p className="mb-10 rounded-card border border-hairline bg-inset px-4 py-3 text-sm-token text-ink-600">
        지금까지 공개된 챕터를 모두 읽으셨습니다 ·{" "}
        <span className="tabular">
          {readCount}/{total}
        </span>{" "}
        챕터
      </p>
    );
  }

  return (
    <Link
      href={next.permalink}
      className="mb-10 block rounded-card border border-hairline bg-sheet p-5 no-underline transition-colors duration-(--dur-micro) hover:bg-jjok-100"
    >
      <span className="block text-caption font-semibold text-ink-600">
        이어서 배우기 ·{" "}
        <span className="tabular">
          {readCount}/{total}
        </span>{" "}
        챕터
      </span>
      <span className="mt-1 block text-body text-ink-900">
        {next.id} · {next.title} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
