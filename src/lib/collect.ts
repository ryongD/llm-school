/**
 * 채집 모드 — 재성(첫 독자) 전용 백로그 수집 (KICKOFF §4.7).
 * 독자에게는 존재 자체가 비노출: 플래그가 없으면 관련 UI가 일절 렌더되지
 * 않는다. 수집물은 localStorage에 쌓고 JSON으로 내보내 data/backlog.json에
 * 수동 병합한다.
 */

const FLAG_KEY = "llm-school.collect.v1.on";
const BACKLOG_KEY = "llm-school.backlog.v1";
/** 같은 탭에서 플래그·목록 갱신을 알리는 커스텀 이벤트 */
export const COLLECT_EVENT = "llm-school:collect";

export interface BacklogItem {
  id: string;
  /** 채집한 용어·구절 (본문에서 선택한 텍스트) */
  word: string;
  /** 출처 — 페이지 경로와 가장 가까운 섹션 앵커 */
  source: { path: string; anchor?: string; title?: string };
  memo?: string;
  /** ISO 일시 */
  at: string;
}

// ---- 플래그 ----

export function isCollectOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function toggleCollect(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const next = !isCollectOn();
    if (next) window.localStorage.setItem(FLAG_KEY, "1");
    else window.localStorage.removeItem(FLAG_KEY);
    window.dispatchEvent(new CustomEvent(COLLECT_EVENT));
    return next;
  } catch {
    return false;
  }
}

// ---- 백로그 ----

export function getBacklog(): BacklogItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BACKLOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as BacklogItem[]) : [];
  } catch {
    return [];
  }
}

function saveBacklog(items: BacklogItem[]): void {
  try {
    window.localStorage.setItem(BACKLOG_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(COLLECT_EVENT));
  } catch {
    // localStorage 불가 환경 — 채집은 재성 전용 편의 기능이라 조용히 무시
  }
}

export function addBacklogItem(
  input: Omit<BacklogItem, "id" | "at">,
): BacklogItem[] {
  const item: BacklogItem = {
    ...input,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `bk-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    at: new Date().toISOString(),
  };
  const items = [...getBacklog(), item];
  saveBacklog(items);
  return items;
}

export function removeBacklogItem(id: string): BacklogItem[] {
  const items = getBacklog().filter((item) => item.id !== id);
  saveBacklog(items);
  return items;
}

export function clearBacklog(): BacklogItem[] {
  saveBacklog([]);
  return [];
}

/** data/backlog.json 병합용 내보내기 문자열 — 파일 스키마와 동일한 배열 */
export function exportBacklogJson(items: BacklogItem[]): string {
  return JSON.stringify(items, null, 2);
}

/** 채집어 정규화 — 앞뒤 공백 제거, 길이 상한 (본문 문단 통째 채집 방지) */
export function normalizeWord(raw: string, maxLen = 80): string {
  const word = raw.replace(/\s+/g, " ").trim();
  return word.length > maxLen ? `${word.slice(0, maxLen)}…` : word;
}
