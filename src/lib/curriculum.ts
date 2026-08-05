/** 커리큘럼 상수 (KICKOFF §6) */

export const PART_NAMES: Record<number, string> = {
  1: "직관",
  2: "구조",
  3: "학습",
  4: "생성",
  5: "경량화와 하드웨어",
  6: "활용",
};

/** 파트 난이도 = 쪽빛의 깊이 (DESIGN §2.3) */
export function partColorVar(part: number): string {
  if (part <= 2) return "var(--part-intro)";
  if (part <= 4) return "var(--part-mid)";
  return "var(--part-advanced)";
}
