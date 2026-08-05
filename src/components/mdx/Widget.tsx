import { WidgetHost } from "@/components/widget/WidgetHost";
import { WidgetSheet } from "@/components/widget/WidgetSheet";
import { findWidgetMeta } from "@/widgets/widget-ids";

/**
 * MDX 위젯 삽입 지점 — <Widget id="tokenizer" /> (KICKOFF §4.2).
 * 레지스트리에 없는 id는 빌드 실패(§4.5-3의 이중 방어 — 린트도 검사).
 */
export function Widget({ id }: { id: string }) {
  const meta = findWidgetMeta(id);
  if (!meta) {
    throw new Error(
      `[<Widget>] 레지스트리에 없는 위젯 id: '${id}' (KICKOFF §4.5-3)`,
    );
  }
  return (
    <WidgetSheet meta={meta}>
      <WidgetHost id={id} />
    </WidgetSheet>
  );
}
