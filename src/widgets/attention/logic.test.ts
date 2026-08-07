import { describe, expect, it } from "vitest";

import traceJson from "../../../data/traces/attention/polyglot-ko-1.3b.json";
import {
  AttentionTrace,
  CURATED_VIEW,
  HEAD_MEAN,
  summarize,
  weightsFor,
} from "./logic";

// 테스트는 정적 임포트로 데이터를 직접 잠근다 (앱 청크에는 미포함 —
// 런타임 로딩은 data.ts의 지연 로딩 경로)
const trace = traceJson as unknown as AttentionTrace;

/**
 * w-attention 골든 테스트 (KICKOFF §5.6).
 * 데이터 구조 불변식 + SPEC-2-1 실측 기록(2026-08-07, polyglot@557e162)을
 * 잠근다. 스팟 수치는 384개 헤드 전수 스캔(probe)과 생성 데이터에서 채록.
 */

describe("w-attention 데이터 불변식", () => {
  it("_meta — 출처·인과 방향·수록 범위가 완전하다 (§3.3)", () => {
    const m = trace._meta;
    expect(m.model).toContain("polyglot-ko-1.3b");
    expect(m.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(m.direction).toContain("causal");
    expect(m.layersStored).toEqual([0, 2, 5, 11, 17, 23]);
    expect(m.layersTotal).toBe(24);
    expect(m.headsTotal).toBe(16);
    // HEAD_MEAN 상수(로직)와 데이터의 평균 자리(headsTotal)가 일치해야 한다
    expect(m.headsTotal).toBe(HEAD_MEAN);
    expect(m.topK).toBe(3);
  });

  it("문장 8종, 층마다 16헤드+평균, 행 수 = 토큰 수", () => {
    expect(trace.sentences).toHaveLength(8);
    for (const s of trace.sentences) {
      for (const layer of trace._meta.layersStored) {
        const heads = s.layers[String(layer)];
        expect(heads).toHaveLength(trace._meta.headsTotal + 1);
        for (const rows of heads) {
          expect(rows).toHaveLength(s.tokens.length);
        }
      }
    }
  });

  it("인과 성질 — 모든 대상 인덱스는 질의 인덱스 이하, 가중치는 0~100", () => {
    for (const s of trace.sentences) {
      for (const layer of trace._meta.layersStored) {
        for (const rows of s.layers[String(layer)]) {
          rows.forEach((pairs, q) => {
            expect(pairs.length).toBeGreaterThanOrEqual(1);
            expect(pairs.length).toBeLessThanOrEqual(trace._meta.topK);
            for (const [to, w] of pairs) {
              expect(to).toBeGreaterThanOrEqual(0);
              expect(to).toBeLessThanOrEqual(q);
              expect(w).toBeGreaterThanOrEqual(0);
              expect(w).toBeLessThanOrEqual(100);
            }
          });
        }
      }
    }
  });

  it("스팟 — 훅 문장: '타고'(4)는 첫 '배'(2)를 94로 1위 응시 (L2·H15)", () => {
    const s = trace.sentences[0];
    expect(s.tokens[2]).toBe(" 배");
    expect(s.tokens[4]).toBe(" 타고");
    const pairs = weightsFor(s, 2, 15, 4);
    expect(pairs[0]).toEqual([2, 94]);
  });

  it("스팟 — '먹'(9)은 둘째 '배'(7)를 90으로 1위 응시, 첫째 '배'(2)는 top-3 밖 (L2·H8)", () => {
    const s = trace.sentences[0];
    expect(s.tokens[7]).toBe(" 배");
    expect(s.tokens[9]).toBe(" 먹");
    const pairs = weightsFor(s, 2, 8, 9);
    expect(pairs[0]).toEqual([7, 90]);
    // 오답 방향(같은 글자의 다른 '배')은 이 헤드 상위에 없다 — 아하의 근거
    expect(pairs.map(([to]) => to)).not.toContain(2);
  });

  it("스팟 — 대명사: '그것'(6)→'사과'(2) 54로 1위 (L0·H6)", () => {
    const s = trace.sentences[1];
    expect(s.tokens[6]).toBe(" 그것");
    const pairs = weightsFor(s, 0, 6, 6);
    expect(pairs[0]).toEqual([2, 54]);
  });

  it("스팟 — 헤드 평균의 첫 토큰 쏠림(싱크): 비 문장 L11 평균에서 '을'(4)→'비'(0) ≥ 70", () => {
    const s = trace.sentences[5];
    expect(s.tokens[0]).toBe("비");
    const pairs = weightsFor(s, 11, HEAD_MEAN, 4);
    expect(pairs[0][0]).toBe(0);
    expect(pairs[0][1]).toBeGreaterThanOrEqual(70);
  });

  it("추천 보기(CURATED_VIEW)는 유효한 좌표를 가리킨다", () => {
    const s = trace.sentences[CURATED_VIEW.sentence];
    expect(s).toBeDefined();
    expect(trace._meta.layersStored).toContain(CURATED_VIEW.layer);
    const pairs = weightsFor(s, CURATED_VIEW.layer, CURATED_VIEW.head, CURATED_VIEW.query);
    expect(pairs.length).toBeGreaterThan(0);
  });

  it("summarize — 질의·대상·퍼센트를 담은 요약 문자열", () => {
    const s = trace.sentences[0];
    const text = summarize(s, 2, 15, 4);
    expect(text).toContain("타고");
    expect(text).toContain("배");
    expect(text).toContain("94%");
  });
});
