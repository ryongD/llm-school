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

/** 파트 간 연결 질문 (KICKOFF §6 서사 구조 — 고정 문안). key = 앞 파트 번호 */
export const PART_CONNECTIONS: Record<number, string> = {
  1: "토큰을 숫자로 바꿨는데, 이 숫자들로 뭘 하지?",
  2: "구조는 알겠는데 저 가중치들은 어디서 왔지?",
  3: "학습된 모델이 실제로 답을 뱉는 순간엔 무슨 일이?",
  4: "그런데 이게 왜 이렇게 크고 비싸지?",
  5: "그래서 나는 이걸로 뭘 만들 수 있지?",
};
