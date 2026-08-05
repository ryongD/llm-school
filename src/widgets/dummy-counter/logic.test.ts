import { describe, expect, it } from "vitest";

import { square } from "./logic";

/**
 * 골든 테스트 (KICKOFF §5.6) — 정답값의 근거를 주석으로 남긴다(§11.2-4).
 * 근거: 곱셈의 정의에 따른 산술 자명값 (n² = n × n). 외부 출처 불필요.
 * 이 파일은 더미 위젯과 함께 Phase 1에서 실위젯 골든 테스트로 대체된다.
 */
describe("dummy-counter logic (golden)", () => {
  it("square", () => {
    expect(square(0)).toBe(0); // 0 × 0 = 0
    expect(square(3)).toBe(9); // 3 × 3 = 9
    expect(square(10)).toBe(100); // 10 × 10 = 100
  });
});
