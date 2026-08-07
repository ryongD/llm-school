import { describe, expect, it } from "vitest";

import { exportBacklogJson, normalizeWord } from "./collect";

describe("채집 모드 — 순수 함수", () => {
  it("normalizeWord — 공백 정리와 길이 상한", () => {
    expect(normalizeWord("  코사인   유사도\n")).toBe("코사인 유사도");
    expect(normalizeWord("가".repeat(100))).toBe(`${"가".repeat(80)}…`);
    expect(normalizeWord("   ")).toBe("");
  });

  it("exportBacklogJson — data/backlog.json 병합 스키마(배열)와 동일", () => {
    const items = [
      {
        id: "bk-1",
        word: "말뭉치",
        source: { path: "/llm/token", anchor: "글자도-단어도-아닌-조각" },
        memo: "용어 등재 후보",
        at: "2026-08-07T00:00:00.000Z",
      },
    ];
    const parsed = JSON.parse(exportBacklogJson(items));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].word).toBe("말뭉치");
    expect(parsed[0].source.path).toBe("/llm/token");
  });
});
