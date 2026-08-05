import type { WidgetMeta } from "@/widgets/types";

/**
 * 위젯 스켈레톤 (DESIGN §5.4) — 최종 위젯과 동일 높이 고정(CLS 방지),
 * 펄스 금지(잔잔한 지면 유지). 정적 + 우하단 미세 스피너.
 * 도면 시트 셸 내부에 렌더되므로 모눈 배경은 셸이 담당한다.
 */
export function WidgetSkeleton({ meta }: { meta: WidgetMeta }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: meta.heightPx }}
      aria-label={`${meta.title} 불러오는 중`}
    >
      <p className="text-sm-token text-ink-400">{meta.title}</p>
      <span
        className="absolute right-3 bottom-3 size-4 animate-spin rounded-full border-2 border-hairline-strong border-t-jjok-500"
        role="presentation"
      />
    </div>
  );
}
