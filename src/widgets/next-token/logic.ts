/**
 * w-next-token 로직 — UI와 분리된 순수 계층 (KICKOFF §3.2, §8.2.2).
 * L2: 사전계산 트레이스(data/traces/next-token/)를 재생만 한다.
 * 트레이스는 재성 로컬(RTX 3080)에서 scripts/precompute/next_token.py로
 * 생성됐고, _meta가 곧 출처 표기다(§3.3).
 */

import traceJson from "../../../data/traces/next-token/polyglot-ko-1.3b.json";

export interface TopkEntry {
  id: number;
  token: string;
  logprob: number;
}

export interface TraceStep {
  /** 예측 대상 토큰의 문장 내 위치 (문맥 = tokens[0..position)) */
  position: number;
  topk: TopkEntry[];
  actual: { id: number; token: string; logprob: number; rank: number };
}

export interface TraceSentence {
  text: string;
  tokens: string[];
  steps: TraceStep[];
}

export interface TraceMeta {
  model: string;
  revision: string;
  script: string;
  generatedAt: string;
  seed: number;
  topK: number;
}

export interface TraceFile {
  _meta: TraceMeta;
  sentences: TraceSentence[];
}

export const trace: TraceFile = traceJson as TraceFile;

/** 위젯이 막대로 보여줄 후보 수 (§6 — 추출은 top-8, 표시는 top-5) */
export const DISPLAY_TOP_N = 5;

/** 로그확률 → 확률 (0~1) */
export function probOf(logprob: number): number {
  return Math.exp(logprob);
}

/** 확률 표기 — 1% 미만은 소수 둘째 자리까지 (0으로 뭉개지 않는 정직 표기) */
export function formatPercent(logprob: number): string {
  const pct = probOf(logprob) * 100;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(2)}%`;
}

/** 공백·개행을 눈에 보이게 (칩 내부 표시용) */
export function displayToken(token: string): string {
  return token.replaceAll("\n", "⏎");
}

/** 실제 다음 토큰이 표시 후보(top-N) 안에 있는지 */
export function actualInTopN(step: TraceStep, n: number = DISPLAY_TOP_N): boolean {
  return step.topk.slice(0, n).some((t) => t.id === step.actual.id);
}
