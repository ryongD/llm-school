import type { WidgetMeta } from "../types";

/** w-embedding-map — 1-3의 앵커 (KICKOFF §8.1·§8.2.3). 도구 페이지 없음 */
export const meta: WidgetMeta = {
  id: "w-embedding-map",
  title: "임베딩 지도 — 의미를 좌표로",
  description:
    "한국어 단어 538개의 임베딩을 2D 지도로 탐색한다. 검색으로 단어를 찾아 원 공간 기준 이웃을 확인하고, 유추 버튼(아빠−남자+여자 등)으로 단어 산수를 재생한다. 2D는 300차원의 그림자라는 사실을 숨기지 않는다.",
  tier: "L2",
  dataDeps: ["data/traces/embeddings/map-2d.json"],
  sizeBudgetKB: 80,
  heightPx: 640,
  dataCaption:
    "데이터: FastText cc.ko.300 (CC-BY-SA 3.0) — 2D는 표시용 투영, 이웃·유추는 원 300차원 계산. 생성 정보는 위젯 하단 표기",
};
