import { describe, expect, it } from "vitest";

import { widgetRegistry } from "./registry";
import { widgetIds, widgetMetas } from "./widget-ids";

/**
 * 위젯 등록 불변식 (CP1 제안 반영).
 * 등록 지점이 두 곳(widget-ids.ts — 노드 안전 / registry.tsx — lazy 컴포넌트)이라
 * 한쪽 누락은 published 렌더 시점에야 터진다 — 여기서 즉시 잡는다.
 */
describe("widget registry 불변식", () => {
  it("widget-ids와 registry의 id 집합이 일치한다", () => {
    expect(Object.keys(widgetRegistry).sort()).toEqual([...widgetIds].sort());
  });

  it("L2/L3 위젯은 dataCaption(데이터 생성 메타)이 필수다 (DESIGN §5.1)", () => {
    for (const meta of widgetMetas) {
      if (meta.tier !== "L1") {
        expect(
          meta.dataCaption,
          `[${meta.id}] ${meta.tier} 위젯에 dataCaption이 없습니다`,
        ).toBeTruthy();
      }
    }
  });

  it("meta 필수 필드 — heightPx 양수, sizeBudgetKB는 §3.5 예산(80KB) 이내", () => {
    for (const meta of widgetMetas) {
      expect(meta.heightPx, `[${meta.id}] heightPx`).toBeGreaterThan(0);
      expect(
        meta.sizeBudgetKB,
        `[${meta.id}] sizeBudgetKB — KICKOFF §3.5 위젯 청크 예산`,
      ).toBeLessThanOrEqual(80);
    }
  });
});
