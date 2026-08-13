import { describe, expect, it } from "vitest";

import {
  axisMax,
  axisMin,
  finalLayer,
  METRICS,
  seriesFor,
  stateCount,
  summarize,
  trace,
} from "./logic";

/**
 * w-layer-flow 골든 테스트 (KICKOFF §5.6).
 * SPEC-2-3의 실측 기록(2026-08-13, polyglot@557e162)을 잠근다. 챕터 2-3이
 * 인용할 수치가 여기 걸려 있다 — 데이터를 다시 만들면 본문도 함께 고쳐야
 * 한다는 신호가 이 테스트다.
 */

describe("w-layer-flow 데이터 불변식", () => {
  it("_meta — 출처와 저장 규칙이 완전하다 (§3.3)", () => {
    const m = trace._meta;
    expect(m.model).toContain("polyglot-ko-1.3b");
    expect(m.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(m.layersTotal).toBe(24);
    expect(m.drift).toContain("직전 층");
    expect(m.fromInput).toContain("입력 임베딩");
  });

  it("문장 6개, 상태 25개(입력 + 24층), 배열 길이가 토큰 수와 맞는다", () => {
    expect(trace.sentences).toHaveLength(6);
    for (const s of trace.sentences) {
      expect(stateCount(s)).toBe(25);
      for (const key of ["drift", "fromInput", "norm"] as const) {
        expect(s[key]).toHaveLength(25);
        for (const layer of s[key]) {
          expect(layer).toHaveLength(s.tokens.length);
        }
      }
    }
  });

  it("백분율 지표는 코사인 ×100이라 음수 가능(−100~100), 길이는 양수", () => {
    for (const s of trace.sentences) {
      for (const key of ["drift", "fromInput"] as const) {
        for (const layer of s[key]) {
          for (const v of layer) {
            expect(v).toBeGreaterThanOrEqual(-100);
            expect(v).toBeLessThanOrEqual(100);
          }
        }
      }
      for (const layer of s.norm) {
        for (const v of layer) expect(v).toBeGreaterThan(0);
      }
    }
  });

  it("스팟 — 1층은 갈아엎기(1~10), 2~23층은 덧쓰기(85~100) (2-3 아하의 근거)", () => {
    const first: number[] = [];
    const middle: number[] = [];
    for (const s of trace.sentences) {
      first.push(...s.drift[1]);
      for (let layer = 2; layer <= 23; layer++) middle.push(...s.drift[layer]);
    }
    expect(Math.min(...first)).toBe(1);
    expect(Math.max(...first)).toBe(10);
    expect(Math.min(...middle)).toBe(85);
    expect(Math.max(...middle)).toBe(100);
    // 본문이 인용하는 "거의 다 95 이상" — 1,606건 중 95 미만은 21건
    const below = middle.filter((v) => v < 95).length;
    expect(middle).toHaveLength(1606);
    expect(below).toBe(21);
  });

  it("스팟 — 마지막 층은 다시 크게 변한다 (최종 LayerNorm)", () => {
    for (const s of trace.sentences) {
      const last = finalLayer(s);
      expect(Math.min(...s.drift[last])).toBeLessThan(90);
      // 길이도 급감한다
      const before = Math.max(...s.norm[last - 1]);
      const after = Math.max(...s.norm[last]);
      expect(after).toBeLessThan(before / 5);
    }
  });

  it("스팟 — 입력 임베딩과의 유사도는 0 근처로 수렴 (23층 −4~4)", () => {
    const values = trace.sentences.flatMap((s) => s.fromInput[23]);
    expect(Math.min(...values)).toBe(-4);
    expect(Math.max(...values)).toBe(4);
  });

  it("스팟 — 첫 토큰의 23층 길이가 나머지 최댓값의 5배 이상 (문장 1)", () => {
    const s = trace.sentences[0];
    const first = s.norm[23][0];
    const rest = Math.max(...s.norm[23].slice(1));
    expect(first).toBeGreaterThan(rest * 5);
  });
});

describe("w-layer-flow 순수 함수", () => {
  const s = trace.sentences[0];

  it("seriesFor — 층 수만큼의 값을 뽑는다", () => {
    expect(seriesFor(s, "drift", 0)).toHaveLength(25);
    expect(seriesFor(s, "drift", 0)[0]).toBe(100); // 0층은 100으로 채움
  });

  it("axisMax — 백분율은 100 고정, 길이는 자릿수에 맞춰 올림", () => {
    expect(axisMax("drift", [5, 99])).toBe(100);
    expect(axisMax("fromInput", [0, 3])).toBe(100);
    expect(axisMax("norm", [120, 980])).toBe(1000);
    expect(axisMax("norm", [5148])).toBe(6000);
  });

  it("axisMin — 음수 코사인이 있으면 축을 내린다(자르지 않는다)", () => {
    expect(axisMin("drift", [5, 99])).toBe(0);
    expect(axisMin("fromInput", [-4, 3])).toBe(-20);
    expect(axisMin("norm", [120, 980])).toBe(0);
  });

  it("METRICS — 세 지표에 라벨과 설명이 있다", () => {
    expect(METRICS).toHaveLength(3);
    for (const m of METRICS) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.help.length).toBeGreaterThan(0);
    }
  });

  it("summarize — drift는 가운데 층 범위를 함께 말해 준다", () => {
    const text = summarize(s, "drift", 2);
    expect(text).toContain("가운데 층들");
    expect(text).toContain("1층");
  });
});
