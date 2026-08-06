import type { WidgetMeta } from "../types";

/** w-next-token — 1-2의 앵커 (KICKOFF §8.1·§8.2.2). 도구 페이지 없음 */
export const meta: WidgetMeta = {
  id: "w-next-token",
  title: "다음 토큰 맞히기 — LLM의 유일한 일",
  description:
    "큐레이션된 한국어 문장을 토큰 단위로 한 걸음씩 진행하며, 실제 소형 모델이 각 위치에서 예측한 다음 토큰 확률(top-5)과 실제 정답을 비교한다. 내 예상 모드로 독자가 먼저 찍어볼 수 있다.",
  tier: "L2",
  dataDeps: ["data/traces/next-token/polyglot-ko-1.3b.json"],
  sizeBudgetKB: 80,
  heightPx: 560,
  // 상세 생성 메타(모델·리비전·생성일)는 위젯 하단에서 트레이스 _meta로 동적 표시
  dataCaption:
    "데이터: EleutherAI/polyglot-ko-1.3b 사전계산 트레이스 재생 — 생성 정보는 위젯 하단 표기",
};
