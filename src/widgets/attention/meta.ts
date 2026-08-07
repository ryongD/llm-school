import type { WidgetMeta } from "../types";

/** w-attention — 2-1의 앵커, 2-2가 그리드 모드로 재사용 (KICKOFF §8.1·§6) */
export const meta: WidgetMeta = {
  id: "w-attention",
  title: "어텐션 — 서로를 쳐다보는 단어들",
  description:
    "한국어 문장 8개의 실제 어텐션 가중치를 재생한다. 토큰을 탭하면 그 토큰이 앞 토큰들을 쳐다보는 세기가 선으로 표시되고, 층·헤드 셀렉터로 다른 연결을 탐색한다. 헤드 평균의 첫 토큰 쏠림도 숨기지 않는다.",
  tier: "L2",
  dataDeps: ["data/traces/attention/polyglot-ko-1.3b.json"],
  // 코드 청크 예산(§3.5). 트레이스 262KB는 별도 비동기 청크(지연 로딩)
  sizeBudgetKB: 80,
  heightPx: 560,
  dataCaption:
    "데이터: EleutherAI/polyglot-ko-1.3b 실측 어텐션 — 각 토큰은 자신과 앞 토큰만 봅니다(인과 모델). 24층 중 6층, 질의당 상위 3개 저장. 생성 정보는 위젯 하단 표기",
};
