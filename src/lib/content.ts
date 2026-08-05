import { chapters, glossary } from "#velite";
import type { Chapter, GlossaryTerm } from "#velite";

/**
 * 콘텐츠 조회 헬퍼.
 * 노출 규칙(§4.1): 프로덕션에는 status === "published" 만 노출한다.
 * 개발 모드에서는 집필 편의를 위해 전 상태를 보여준다.
 */

const isProduction = process.env.NODE_ENV === "production";

export function visibleChapters(): Chapter[] {
  const list = isProduction
    ? chapters.filter((c) => c.status === "published")
    : [...chapters];
  return list.sort((a, b) => a.part - b.part || a.order - b.order);
}

/** slug는 트랙 내에서만 유일하다(§13 URL 규칙, CP1 C5) — 반드시 track과 함께 조회 */
export function findChapterBySlug(
  track: string,
  slug: string,
): Chapter | undefined {
  return visibleChapters().find((c) => c.track === track && c.slug === slug);
}

export function findChapterById(id: string): Chapter | undefined {
  return visibleChapters().find((c) => c.id === id);
}

/** 커리큘럼 순서(파트 → order)상 다음 챕터 */
export function nextChapterOf(current: Chapter): Chapter | undefined {
  const list = visibleChapters();
  const idx = list.findIndex((c) => c.id === current.id);
  if (idx === -1) return undefined;
  return list[idx + 1];
}

export function visibleGlossary(): GlossaryTerm[] {
  return isProduction
    ? glossary.filter((g) => g.status === "published")
    : [...glossary];
}

/** 미등재·미공개 용어는 undefined → <Term>이 평문으로 렌더한다(§4.7). */
export function findGlossaryTerm(slug: string): GlossaryTerm | undefined {
  return visibleGlossary().find((g) => g.slug === slug);
}
