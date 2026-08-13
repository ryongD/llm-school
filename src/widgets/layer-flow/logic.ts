/**
 * w-layer-flow 로직 — UI와 분리된 순수 계층 (KICKOFF §3.2, SPEC-2-3).
 * L2: 사전계산 트레이스(data/traces/layer-flow)를 재생만 한다.
 *
 * 저장된 세 수치는 전부 [층][토큰] 배열이다.
 *   drift      직전 층 대비 코사인 유사도 ×100 (0층은 100으로 채움)
 *   fromInput  입력 임베딩 대비 코사인 유사도 ×100
 *   norm       표현 벡터의 길이(정수)
 *
 * 0층은 입력 임베딩이고 마지막 층은 최종 LayerNorm이 적용된 출력이라,
 * 두 끝은 성질이 다르다(SPEC-2-3 실측). 이 사실은 UI가 캡션으로 밝힌다.
 */

import traceJson from "../../../data/traces/layer-flow/polyglot-ko-1.3b.json";

export interface LayerFlowMeta {
  model: string;
  revision: string;
  script: string;
  generatedAt: string;
  layersTotal: number;
  statesStored: string;
  drift: string;
  fromInput: string;
  norm: string;
}

export interface LayerFlowSentence {
  text: string;
  tokens: string[];
  drift: number[][];
  fromInput: number[][];
  norm: number[][];
}

export interface LayerFlowTrace {
  _meta: LayerFlowMeta;
  sentences: LayerFlowSentence[];
}

export const trace = traceJson as unknown as LayerFlowTrace;

export type Metric = "drift" | "fromInput" | "norm";

export const METRICS: { key: Metric; label: string; unit: string; help: string }[] = [
  {
    key: "drift",
    label: "직전 층 대비",
    unit: "%",
    help: "이 층에서 표현이 얼마나 그대로인지. 100에 가까울수록 덜 변했습니다.",
  },
  {
    key: "fromInput",
    label: "입력 대비",
    unit: "%",
    help: "맨 처음 좌표와 얼마나 닮았는지.",
  },
  {
    key: "norm",
    label: "벡터 길이",
    unit: "",
    help: "표현 벡터의 크기. 층을 지나며 커집니다.",
  },
];

/** 저장된 상태 수 = 입력 임베딩 + 각 층 출력 */
export function stateCount(sentence: LayerFlowSentence): number {
  return sentence.drift.length;
}

/** 한 토큰의 층별 값 시리즈 */
export function seriesFor(
  sentence: LayerFlowSentence,
  metric: Metric,
  tokenIndex: number,
): number[] {
  return sentence[metric].map((layer) => layer[tokenIndex]);
}

/** 축 상한 — 백분율 지표는 100 고정, 길이는 데이터에 맞춰 올림 */
export function axisMax(metric: Metric, values: number[]): number {
  if (metric !== "norm") return 100;
  const max = Math.max(...values, 1);
  const digits = Math.max(1, Math.floor(Math.log10(max)));
  const step = Math.pow(10, digits);
  return Math.ceil(max / step) * step;
}

/**
 * 축 하한. 코사인 유사도는 음수가 될 수 있다(실측 최저 −4). 0으로 자르면
 * 그 점이 축에 눌러붙어 사실과 다르게 보이므로, 음수가 있으면 축을 내린다.
 */
export function axisMin(metric: Metric, values: number[]): number {
  if (metric === "norm") return 0;
  return Math.min(...values) < 0 ? -20 : 0;
}

/** 마지막 층 인덱스(최종 LayerNorm이 적용된 자리) */
export function finalLayer(sentence: LayerFlowSentence): number {
  return stateCount(sentence) - 1;
}

/**
 * 시각화 요약 텍스트(DESIGN §8). 본문이 인용하는 "가운데 층들은 거의
 * 안 변한다"를 숫자로 말해 준다.
 */
export function summarize(
  sentence: LayerFlowSentence,
  metric: Metric,
  tokenIndex: number,
): string {
  const series = seriesFor(sentence, metric, tokenIndex);
  const token = sentence.tokens[tokenIndex].trim() || sentence.tokens[tokenIndex];
  const label = METRICS.find((m) => m.key === metric)!.label;
  const last = finalLayer(sentence);
  if (metric === "drift") {
    const middle = series.slice(2, last);
    const lo = Math.min(...middle);
    const hi = Math.max(...middle);
    return `"${token}"의 ${label}: 1층 ${series[1]}%, 가운데 층들(2~${last - 1}층) ${lo}~${hi}%, 마지막 층 ${series[last]}%`;
  }
  return `"${token}"의 ${label}: 0층 ${series[0]}, ${last}층 ${series[last]}`;
}
