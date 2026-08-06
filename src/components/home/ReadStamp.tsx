"use client";

import { useEffect, useState } from "react";

import { useProgressIds } from "@/components/useProgressIds";

/**
 * 완독 인주 스탬프 (DESIGN §1.2 — 시그니처. 아껴 찍는다).
 * 완독한 챕터 카드의 우상단에만 찍힌다. 찍히는 모션(-5° 회전 + 220ms
 * 스케일 다운)은 완독 후 이 브라우저 세션에서 처음 보일 때 1회만 —
 * 이후 방문에서는 정적으로 유지한다(장식 모션 반복 금지 §7).
 * 글리프는 D9 결정 대기 — 임시 추상 인장.
 */
export function ReadStamp({ chapterId }: { chapterId: string }) {
  const { readIds } = useProgressIds();
  const [animate, setAnimate] = useState(false);
  const isRead = readIds.has(chapterId);

  useEffect(() => {
    if (!isRead) return;
    const seenKey = `llm-school.stamp-seen.${chapterId}`;
    try {
      if (!window.sessionStorage.getItem(seenKey)) {
        window.sessionStorage.setItem(seenKey, "1");
        setAnimate(true);
      }
    } catch {
      // sessionStorage 불가 — 모션 없이 정적 표시
    }
  }, [isRead, chapterId]);

  if (!isRead) return null;

  return (
    <svg
      viewBox="0 0 40 40"
      width="32"
      height="32"
      role="img"
      aria-label="완독 도장"
      className={`absolute -top-2 -right-2 text-inju-500 ${animate ? "stamp-in" : "-rotate-[5deg]"}`}
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
  );
}
