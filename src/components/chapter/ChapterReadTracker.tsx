"use client";

import { useEffect, useRef } from "react";

import { markChapterRead } from "@/lib/progress";

/**
 * 완독 기록 센티널 — 챕터 본문 맨 끝에 렌더되고, 뷰포트에 들어오면
 * (= 독자가 참고문헌·다음 챕터 카드까지 도달하면) 진도를 기록한다.
 * 화면에는 아무것도 그리지 않는다.
 */
export function ChapterReadTracker({ chapterId }: { chapterId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 마운트 시점에 이미 끝이 보이면(짧은 챕터·복원 스크롤) 즉시 기록 —
    // 프레임에 의존하지 않는 동기 검사. 그 외에는 도달을 기다린다.
    if (el.getBoundingClientRect().top <= window.innerHeight) {
      markChapterRead(chapterId);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        markChapterRead(chapterId);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [chapterId]);

  return <div ref={ref} aria-hidden="true" />;
}
