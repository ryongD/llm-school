/**
 * 읽기 진도 — localStorage 기반 (KICKOFF §1.5: 회원 시스템 없음, 이 기기에만 저장).
 * 완독 판정: 챕터 끝(참고문헌·다음 챕터 카드 영역)에 도달했을 때 기록한다.
 * 일러두기의 "진도는 이 기기에 저장됩니다" 약속의 구현체.
 */

const PROGRESS_KEY = "llm-school.progress.v1";
/** 같은 탭 안에서 갱신을 알리는 커스텀 이벤트 (storage 이벤트는 타 탭 전용) */
export const PROGRESS_EVENT = "llm-school:progress";

export interface ProgressMap {
  [chapterId: string]: { readAt: string };
}

export function getProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as ProgressMap)
      : {};
  } catch {
    return {};
  }
}

export function markChapterRead(chapterId: string): void {
  if (typeof window === "undefined") return;
  try {
    const progress = getProgress();
    if (progress[chapterId]) return; // 이미 기록됨 — 최초 완독 시각 유지
    progress[chapterId] = { readAt: new Date().toISOString() };
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
  } catch {
    // localStorage 불가 환경(시크릿 모드 등) — 진도 없이도 학습에 지장 없음
  }
}

/** 순서상 첫 미완독 챕터 (전부 읽었으면 null) — 순수 함수, 테스트 대상 */
export function pickNextUnread<T extends { id: string }>(
  orderedChapters: T[],
  readIds: ReadonlySet<string>,
): T | null {
  for (const chapter of orderedChapters) {
    if (!readIds.has(chapter.id)) return chapter;
  }
  return null;
}
