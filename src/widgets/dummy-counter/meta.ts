import type { WidgetMeta } from "../types";

/**
 * Phase 0 파이프라인 관통 검증용 더미 위젯.
 * 실제 위젯(w-tokenizer 등)이 등장하는 Phase 1에서 삭제된다.
 */
export const meta: WidgetMeta = {
  id: "dummy-counter",
  title: "더미 위젯 — 제곱 계산기",
  description:
    "위젯 레지스트리 → MDX 임베드 → 도구 페이지 파이프라인을 관통 검증하기 위한 더미. 교육 콘텐츠가 아니다.",
  tier: "L1",
  dataDeps: [],
  sizeBudgetKB: 10,
  heightPx: 200,
  toolPage: true, // 챕터 임베드 ↔ 도구 페이지 컴포넌트 공유 관통 검증(§3.2)
  chapterId: "0-0",
};
