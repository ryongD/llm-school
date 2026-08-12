import type { WidgetMeta } from "../types";

/**
 * 위젯 셸(도면 시트·스켈레톤) 표본용 더미 위젯 — /styleguide 전용.
 * 더미 챕터·용어는 첫 공개(2026-08-13) 때 삭제했고, 이 위젯만 스타일가이드
 * 표본으로 남긴다. 독자 동선에는 노출하지 않는다(toolPage: false).
 */
export const meta: WidgetMeta = {
  id: "dummy-counter",
  title: "표본 위젯 — 제곱 계산기",
  description:
    "위젯 도면 시트와 스켈레톤의 조판 표본. 교육 콘텐츠가 아니며 스타일가이드에서만 쓴다.",
  tier: "L1",
  dataDeps: [],
  sizeBudgetKB: 10,
  heightPx: 200,
};
