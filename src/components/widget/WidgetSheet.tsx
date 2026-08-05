import type { ReactNode } from "react";

import type { WidgetMeta } from "@/widgets/types";

/**
 * 도면 시트 프레임 — 모든 위젯 공통 셸 (DESIGN §5.1).
 * - 본문(42rem)보다 넓은 54rem 브레이크아웃: "구간 전환" 신호
 * - 모눈 배경은 위젯 셸 전용 신호 — 다른 곳(정적 그림·페이지 배경) 사용 금지
 * - 하단 캡션 바: L1은 실시간 계산 고지, L2는 데이터 생성 메타(필수)
 */
export function WidgetSheet({
  meta,
  children,
}: {
  meta: WidgetMeta;
  children: ReactNode;
}) {
  const caption =
    meta.dataCaption ??
    (meta.tier === "L1"
      ? "이 계산은 브라우저에서 실시간으로 수행됩니다"
      : undefined);

  if (meta.tier !== "L1" && !meta.dataCaption) {
    // L2/L3 위젯은 데이터 출처 캡션이 필수다 (DESIGN §5.1, KICKOFF §3.3)
    throw new Error(
      `[widget:${meta.id}] ${meta.tier} 위젯에 dataCaption(데이터 생성 메타)이 없습니다.`,
    );
  }

  return (
    <div className="widget-breakout my-12">
      <section
        role="group"
        aria-label={`직접 해보기: ${meta.title}`}
        className="relative rounded-sheet border border-hairline-strong bg-sheet"
      >
        {/* 라벨 탭 — 사이트 전체에서 "조작 가능 구간"의 학습된 신호 */}
        <span className="absolute top-0 left-4 -translate-y-full rounded-t-ctl border border-b-0 border-hairline-strong bg-jjok-100 px-3 py-1 text-caption font-semibold text-jjok-700">
          직접 해보기
        </span>

        {/* 콘텐츠 영역 — 모눈 시트 */}
        <div
          className="widget-grid-bg rounded-t-sheet"
          style={{ minHeight: meta.heightPx }}
        >
          {children}
        </div>

        {caption ? (
          <div className="border-t border-hairline px-4 py-2 text-caption text-ink-600">
            {caption}
          </div>
        ) : null}
      </section>
    </div>
  );
}
