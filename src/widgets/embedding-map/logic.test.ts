import { describe, expect, it } from "vitest";

import {
  embeddingMap,
  findAnalogy,
  findWordIndex,
  neighborsOf,
  pickNearest,
  Transform,
  WIDGET_ANALOGIES,
  worldToScreen,
  zoomAt,
} from "./logic";

/**
 * w-embedding-map 골든 테스트 (KICKOFF §5.6).
 * 데이터 구조 불변식 + 본문·위젯이 인용하는 실측 성질을 잠근다.
 *
 * 정답값 근거(§11.2-4): 데이터는 FastText cc.ko.300에서
 * scripts/precompute/embedding_map.py로 2026-08-06 생성한 실측이다(_meta).
 * 스팟 성질(도쿄·엄마 1위, 파리→서울 2위, 서울-부산 이웃)은 생성 직후
 * 검수에서 채록했다 — SPEC-1-3 v2의 버튼 채택 근거와 동일.
 */

describe("w-embedding-map 데이터 불변식", () => {
  it("_meta — 출처·계산 기준이 완전하다 (§3.3·정직성 장치)", () => {
    const m = embeddingMap._meta;
    expect(m.source).toContain("cc.ko.300");
    expect(m.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(m.projection).toContain("그림자");
    expect(m.neighborsBasis).toContain("원 300차원");
    expect(m.analogyBasis).toContain("원 300차원");
  });

  it("어휘 500~1,000개(§8.2.3), 좌표는 [0,1] 정규화", () => {
    const n = embeddingMap.words.length;
    expect(n).toBeGreaterThanOrEqual(500);
    expect(n).toBeLessThanOrEqual(1000);
    for (const { x, y } of embeddingMap.words) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it("이웃 — 단어 수와 동일 길이, 각 k=10, 자기 자신 제외, 유효 인덱스", () => {
    expect(embeddingMap.neighbors).toHaveLength(embeddingMap.words.length);
    embeddingMap.neighbors.forEach((ns, i) => {
      expect(ns).toHaveLength(10);
      for (const j of ns) {
        expect(j).toBeGreaterThanOrEqual(0);
        expect(j).toBeLessThan(embeddingMap.words.length);
        expect(j).not.toBe(i);
      }
    });
  });

  it("위젯 채택 유추 3종이 데이터에 존재하고 top-3을 갖는다", () => {
    for (const expr of WIDGET_ANALOGIES) {
      const a = findAnalogy(expr);
      expect(a, expr).toBeDefined();
      expect(a!.top).toHaveLength(3);
    }
  });

  it("스팟 — 서울−한국+일본 = 도쿄(1위), 아빠−남자+여자 = 엄마(1위)", () => {
    expect(findAnalogy("서울 − 한국 + 일본")!.top[0].w).toBe("도쿄");
    expect(findAnalogy("아빠 − 남자 + 여자")!.top[0].w).toBe("엄마");
  });

  it("스팟 — 파리−프랑스+한국은 서울이 top-3 안, 단 1위는 아님 (한계 사례)", () => {
    const a = findAnalogy("파리 − 프랑스 + 한국")!;
    const words = a.top.map((t) => t.w);
    expect(words).toContain("서울");
    expect(a.top[0].w).not.toBe("서울");
  });

  it("스팟 — 이웃 품질: 서울↔부산, 슬픔↔기쁨 (원 공간 기준)", () => {
    const seoul = findWordIndex("서울");
    const sad = findWordIndex("슬픔");
    expect(seoul).toBeGreaterThanOrEqual(0);
    expect(sad).toBeGreaterThanOrEqual(0);
    const seoulNb = neighborsOf(seoul).map((i) => embeddingMap.words[i].w);
    const sadNb = neighborsOf(sad).map((i) => embeddingMap.words[i].w);
    expect(seoulNb).toContain("부산");
    expect(sadNb).toContain("기쁨");
  });
});

describe("뷰포트 변환 (순수 함수)", () => {
  const t: Transform = { s: 1, ox: 10, oy: 10 };

  it("worldToScreen — 초기 변환에서 모서리가 패딩 안쪽", () => {
    expect(worldToScreen(0, 0, t, 100, 100, 10)).toEqual({ x: 10, y: 10 });
    expect(worldToScreen(1, 1, t, 100, 100, 10)).toEqual({ x: 90, y: 90 });
  });

  it("zoomAt — 기준점은 고정, 배율은 한계 내로", () => {
    const z = zoomAt(t, 2, 50, 50);
    expect(z.s).toBe(2);
    // 기준점(50,50)의 화면 위치는 줌 전후 동일해야 한다
    const before = worldToScreen(0.5, 0.5, t, 100, 100, 10);
    const wx = (50 - t.ox) / (80 * t.s); // 기준점의 world 좌표
    const after = worldToScreen(wx, wx, z, 100, 100, 10);
    expect(after.x).toBeCloseTo(50, 6);
    expect(before).toBeDefined();
    // 상한 클램프
    expect(zoomAt({ s: 7, ox: 0, oy: 0 }, 4, 0, 0).s).toBe(8);
  });

  it("pickNearest — 반경 내 최근접, 반경 밖이면 null", () => {
    const words = [
      { w: "가", x: 0, y: 0 },
      { w: "나", x: 1, y: 1 },
    ];
    expect(pickNearest(words, 12, 12, t, 100, 100, 10, 12)).toBe(0);
    expect(pickNearest(words, 50, 50, t, 100, 100, 10, 12)).toBeNull();
  });
});
