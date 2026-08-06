import { describe, expect, it } from "vitest";

import {
  actualInTopN,
  DISPLAY_TOP_N,
  formatPercent,
  probOf,
  trace,
} from "./logic";

/**
 * w-next-token 골든 테스트 (KICKOFF §5.6).
 * 위젯 수식 고정 + 트레이스 데이터의 구조 불변식을 잠근다 —
 * 트레이스를 재생성했을 때 형식이 어긋나면 여기서 잡힌다.
 *
 * 정답값 근거(§11.2-4): 트레이스는 EleutherAI/polyglot-ko-1.3b를
 * 재성 로컬(RTX 3080)에서 2026-08-06 실행해 생성한 실측이다(_meta 참조).
 * 스팟 값 2건은 생성 직후 검수에서 채록했다.
 */

describe("w-next-token 트레이스 불변식", () => {
  it("_meta — 출처 표기가 완전하다 (§3.3)", () => {
    expect(trace._meta.model).toBe("EleutherAI/polyglot-ko-1.3b");
    expect(trace._meta.script).toBe("scripts/precompute/next_token.py");
    expect(trace._meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(trace._meta.topK).toBeGreaterThanOrEqual(DISPLAY_TOP_N);
  });

  it("문장 10개, 각 문장 스텝 수 = 토큰 수 - 1", () => {
    expect(trace.sentences).toHaveLength(10);
    for (const s of trace.sentences) {
      expect(s.steps.length, s.text).toBe(s.tokens.length - 1);
    }
  });

  it("스텝 불변식 — 로그확률 ≤ 0, top-k 내림차순, rank 1이면 top-1과 일치", () => {
    for (const s of trace.sentences) {
      for (const step of s.steps) {
        expect(step.topk.length).toBeGreaterThan(0);
        let prev = 0;
        for (const [i, t] of step.topk.entries()) {
          expect(t.logprob, `${s.text} step${step.position}`).toBeLessThanOrEqual(0);
          if (i > 0) expect(t.logprob).toBeLessThanOrEqual(prev);
          prev = t.logprob;
        }
        expect(step.actual.rank).toBeGreaterThanOrEqual(1);
        if (step.actual.rank === 1) {
          expect(step.actual.id).toBe(step.topk[0].id);
        }
      }
    }
  });

  it("스팟 값 — '대한민국의 수도는' 다음은 ' 서울'이 1순위 (생성 직후 검수 채록)", () => {
    const s = trace.sentences[1];
    expect(s.text).toBe("대한민국의 수도는 서울이다.");
    const step = s.steps.find((st) => s.tokens[st.position] === " 서울");
    expect(step).toBeDefined();
    expect(step!.actual.rank).toBe(1);
    expect(step!.topk[0].token).toBe(" 서울");
  });

  it("스팟 값 — '오늘 점심은' 다음의 ' 김치'는 top-5 밖 (소형 모델 한계 사례)", () => {
    const s = trace.sentences[0];
    const step = s.steps[2];
    expect(step.actual.token).toBe(" 김치");
    expect(step.actual.rank).toBeGreaterThan(DISPLAY_TOP_N);
    expect(actualInTopN(step)).toBe(false);
  });

  it("스팟 값 — '오늘' 다음의 ' 점심'도 top-5 밖 (1-2 본문이 직접 인용, CP2 반영)", () => {
    // 본문 서술 "실제로 이어진 ' 점심'은 상위권에 없었습니다"의 앵커.
    // 트레이스 재생성으로 이 성질이 깨지면 본문도 함께 고쳐야 한다(§11.2-4).
    const step = trace.sentences[0].steps[0];
    expect(step.actual.token).toBe(" 점심");
    expect(actualInTopN(step)).toBe(false);
  });
});

describe("w-next-token 수식", () => {
  it("probOf — 로그확률의 지수 변환", () => {
    expect(probOf(0)).toBe(1); // e^0 = 1
    expect(probOf(Math.log(0.5))).toBeCloseTo(0.5, 10); // 정의 역변환
  });

  it("formatPercent — 1% 미만은 둘째 자리까지 (0%로 뭉개지 않음)", () => {
    expect(formatPercent(Math.log(0.289))).toBe("28.9%");
    expect(formatPercent(Math.log(0.005))).toBe("0.50%");
  });
});
