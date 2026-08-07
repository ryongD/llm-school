/**
 * w-attention 데이터 로더 — 262KB 트레이스를 별도 비동기 청크로 분리해
 * §3.5 코드 청크 예산(80KB)을 지킨다 (토크나이저 사전과 동일한 지연 로딩
 * 패턴 — 위젯 캡션·하단 메타에 수록 범위를 고지한다).
 */

import type { AttentionTrace } from "./logic";

let cached: AttentionTrace | null = null;

export async function loadTrace(): Promise<AttentionTrace> {
  if (cached) return cached;
  const mod = await import(
    "../../../data/traces/attention/polyglot-ko-1.3b.json"
  );
  cached = mod.default as unknown as AttentionTrace;
  return cached;
}
