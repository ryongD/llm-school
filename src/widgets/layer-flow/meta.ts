import type { WidgetMeta } from "../types";

/** w-layer-flow — 2-3의 앵커 (KICKOFF §6 2-3, SPEC-2-3) */
export const meta: WidgetMeta = {
  id: "w-layer-flow",
  title: "층별 변화 — 한 단어가 층을 지나며",
  description:
    "한 토큰의 표현이 24개 층을 지나며 얼마나 변하는지 따라간다. 직전 층 대비 유사도, 입력 대비 유사도, 벡터 길이 세 가지로 볼 수 있고, 잔차연결이 있는 그림과 없는 그림을 모식도로 견줘 본다.",
  tier: "L2",
  dataDeps: ["data/traces/layer-flow/polyglot-ko-1.3b.json"],
  sizeBudgetKB: 80,
  heightPx: 620,
  dataCaption:
    "데이터: EleutherAI/polyglot-ko-1.3b 실측 — 0층은 입력 임베딩, 마지막 층은 최종 LayerNorm이 적용된 출력이라 양 끝은 성질이 다릅니다. 생성 정보는 위젯 하단 표기",
};
