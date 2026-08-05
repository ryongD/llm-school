import { beforeAll, describe, expect, it } from "vitest";

import {
  clampInput,
  formatBytes,
  loadTokenizer,
  MAX_INPUT_CHARS,
  tokenRatio,
  type Tokenizer,
} from "./logic";

/**
 * w-tokenizer 골든 테스트 (KICKOFF §5.6·§8.2.1 — 대표 문장 10개 스냅샷).
 *
 * 정답값 근거(§11.2-4): gpt-tokenizer@3.4.0 의 o200k_base/cl100k_base 인코딩을
 * 2026-08-06에 직접 실행해 채록한 실측 스냅샷이다. 라이브러리 업데이트로
 * 인코딩 결과가 바뀌면 이 테스트가 알려준다 — 그 경우 값 갱신 전에 변경
 * 사유(tiktoken 사전 변경 여부)를 확인할 것.
 */

/** [문장, o200k_base 토큰 수] */
const O200K_SNAPSHOT: [string, number][] = [
  ["안녕하세요", 2],
  ["hello", 1],
  ["딸기", 3],
  ["오늘 점심은 김치찌개다.", 10],
  ["대한민국의 수도는 서울이다.", 8],
  ["The quick brown fox jumps over the lazy dog.", 10],
  ["같은 뜻이라도 한국어가 토큰을 더 씁니다.", 16],
  ["안녕하세요! 반갑습니다 😊", 7],
  ["쀍", 3],
  ["삶과 죽음의 갈림길에서 햄버거를 먹었다.", 18],
];

/** [문장, cl100k_base 토큰 수] — 구세대 인코딩 회귀 확인용 3종 */
const CL100K_SNAPSHOT: [string, number][] = [
  ["안녕하세요", 5],
  ["hello", 1],
  ["딸기", 3],
];

let o200k: Tokenizer;
let cl100k: Tokenizer;

beforeAll(async () => {
  o200k = await loadTokenizer("o200k_base");
  cl100k = await loadTokenizer("cl100k_base");
});

describe("w-tokenizer 골든 (o200k_base)", () => {
  it("대표 문장 10개 토큰 수 스냅샷", () => {
    for (const [sentence, count] of O200K_SNAPSHOT) {
      expect(o200k.tokenize(sentence).tokenCount, sentence).toBe(count);
    }
  });

  it("바이트 폴백 — '딸기'의 '딸'은 두 바이트 조각으로 쪼개진다 (1-1 교육 포인트)", () => {
    const { pieces } = o200k.tokenize("딸기");
    expect(pieces).toHaveLength(3);
    // 조각 0·1은 단독으로 글자가 되지 않는 바이트 조각, 조각 2는 온전한 '기'
    expect(pieces[0].text).toBeNull();
    expect(pieces[1].text).toBeNull();
    expect(pieces[2].text).toBe("기");
  });

  it("1-1 본문 인용값 — '딸기' 토큰 ID·바이트 (챕터 dev 카드가 직접 인용, CP2 A-6-3)", () => {
    // 챕터 본문·dev 카드가 이 값을 산문으로 인용한다 — 라이브러리 갱신으로
    // 인코딩이 바뀌면 본문도 함께 고쳐야 하므로 여기서 고정한다(§11.2-4).
    const { pieces } = o200k.tokenize("딸기");
    expect(pieces.map((p) => p.id)).toEqual([15492, 116, 4283]);
    expect(formatBytes(pieces[0].bytes)).toBe("EB 94");
    expect(formatBytes(pieces[1].bytes)).toBe("B8");
  });

  it("조각 바이트를 이어 붙이면 원문과 정확히 일치한다 (무손실 분해)", () => {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    for (const [sentence] of O200K_SNAPSHOT) {
      const { pieces } = o200k.tokenize(sentence);
      const allBytes = new Uint8Array(pieces.flatMap((p) => p.bytes));
      expect(decoder.decode(allBytes), sentence).toBe(sentence);
    }
  });

  it("글자당 토큰 비율 — 같은 인삿말이 한국어에서 더 비싸다 (Petrov 2023 방향성)", () => {
    const ko = o200k.tokenize("안녕하세요");
    const en = o200k.tokenize("hello");
    // 절대값이 아니라 '비율 계산이 맞는가'만 고정한다: 2/5 vs 1/5
    expect(ko.tokensPerChar).toBeCloseTo(2 / 5, 10);
    expect(en.tokensPerChar).toBeCloseTo(1 / 5, 10);
  });
});

describe("w-tokenizer 골든 (cl100k_base)", () => {
  it("구세대 인코딩 스냅샷 — 안녕하세요가 5토큰이던 시절", () => {
    for (const [sentence, count] of CL100K_SNAPSHOT) {
      expect(cl100k.tokenize(sentence).tokenCount, sentence).toBe(count);
    }
  });
});

describe("입력 유틸", () => {
  it("clampInput — 5,000자 초과 시 코드포인트 기준 절단", () => {
    const long = "가".repeat(MAX_INPUT_CHARS + 10);
    const { text, truncated } = clampInput(long);
    expect(truncated).toBe(true);
    expect([...text]).toHaveLength(MAX_INPUT_CHARS);
    expect(clampInput("짧은 글").truncated).toBe(false);
  });

  it("tokenRatio — 0 나눗셈 가드", () => {
    expect(tokenRatio(10, 5)).toBe(2);
    expect(tokenRatio(10, 0)).toBeNull();
  });
});
