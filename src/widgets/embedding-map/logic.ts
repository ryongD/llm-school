/**
 * w-embedding-map 로직 — UI와 분리된 순수 계층 (KICKOFF §3.2, §8.2.3).
 * L2: 사전계산 데이터(data/traces/embeddings/map-2d.json)를 재생만 한다.
 * 좌표는 UMAP 2D 투영(표시용 그림자), 이웃·유추는 원 300차원 공간 계산 —
 * 이 구분이 이 위젯의 정직성 장치다(SPEC-1-3).
 */

import mapJson from "../../../data/traces/embeddings/map-2d.json";

export interface MapWord {
  w: string;
  x: number;
  y: number;
}

export interface AnalogyResult {
  expr: string;
  terms: string[];
  top: { w: string; score: number }[];
  filter?: string;
  note?: string;
}

export interface MapMeta {
  source: string;
  sourceUrl: string;
  script: string;
  generatedAt: string;
  seed: number;
  dim: number;
  projection: string;
  neighborsBasis: string;
  analogyBasis: string;
}

export interface MapData {
  _meta: MapMeta;
  words: MapWord[];
  neighbors: number[][];
  analogies: AnalogyResult[];
}

export const embeddingMap: MapData = mapJson as MapData;

/**
 * 위젯 버튼으로 노출할 유추 (SPEC-1-3 v2 — 재성 확정).
 * 성공 2건 + "유추의 한계" 정직 사례 1건. 왕·형 유추는 실측 실패로 위젯
 * 제외(실패는 챕터 본문이 다룬다).
 */
export const WIDGET_ANALOGIES = [
  "서울 − 한국 + 일본",
  "아빠 − 남자 + 여자",
  "파리 − 프랑스 + 한국",
] as const;

export function findWordIndex(word: string): number {
  return embeddingMap.words.findIndex((e) => e.w === word);
}

export function neighborsOf(index: number): number[] {
  return embeddingMap.neighbors[index] ?? [];
}

export function findAnalogy(expr: string): AnalogyResult | undefined {
  return embeddingMap.analogies.find((a) => a.expr === expr);
}

// ---- 뷰포트 변환 (순수 함수 — 테스트 대상) ----

export interface Transform {
  s: number;
  ox: number;
  oy: number;
}

export const MIN_SCALE = 0.8;
export const MAX_SCALE = 8;

/** world [0,1]² → 화면 px. 초기 상태는 { s: 1, ox: pad, oy: pad } */
export function worldToScreen(
  wx: number,
  wy: number,
  t: Transform,
  width: number,
  height: number,
  pad: number,
): { x: number; y: number } {
  return {
    x: wx * (width - 2 * pad) * t.s + t.ox,
    y: wy * (height - 2 * pad) * t.s + t.oy,
  };
}

/** 화면의 한 점(cx, cy)을 고정한 채 배율을 factor배 조정 */
export function zoomAt(
  t: Transform,
  factor: number,
  cx: number,
  cy: number,
): Transform {
  const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.s * factor));
  const applied = next / t.s;
  return {
    s: next,
    ox: cx - (cx - t.ox) * applied,
    oy: cy - (cy - t.oy) * applied,
  };
}

/** 특정 단어가 화면 중앙에 오도록 하는 변환 */
export function centerOn(
  word: MapWord,
  scale: number,
  width: number,
  height: number,
  pad: number,
): Transform {
  return {
    s: scale,
    ox: width / 2 - word.x * (width - 2 * pad) * scale,
    oy: height / 2 - word.y * (height - 2 * pad) * scale,
  };
}

/** 화면 좌표에서 가장 가까운 단어 (maxDistPx 이내, 없으면 null) */
export function pickNearest(
  words: MapWord[],
  sx: number,
  sy: number,
  t: Transform,
  width: number,
  height: number,
  pad: number,
  maxDistPx: number,
): number | null {
  let best = -1;
  let bestDist = maxDistPx * maxDistPx;
  for (let i = 0; i < words.length; i++) {
    const p = worldToScreen(words[i].x, words[i].y, t, width, height, pad);
    const d = (p.x - sx) ** 2 + (p.y - sy) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best === -1 ? null : best;
}
