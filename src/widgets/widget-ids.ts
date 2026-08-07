/**
 * 위젯 메타 목록 — React/next 의존이 없는 노드 안전 모듈.
 * scripts/lint-content.ts(§4.5-3)와 서버 컴포넌트가 공유한다.
 * 새 위젯 추가 시: 폴더 생성 → meta.ts 작성 → 여기와 registry.tsx 두 곳에 등록.
 */
import { meta as attention } from "./attention/meta";
import { meta as dummyCounter } from "./dummy-counter/meta";
import { meta as embeddingMap } from "./embedding-map/meta";
import { meta as nextToken } from "./next-token/meta";
import { meta as tokenizer } from "./tokenizer/meta";
import type { WidgetMeta } from "./types";

export const widgetMetas: WidgetMeta[] = [
  dummyCounter,
  tokenizer,
  nextToken,
  embeddingMap,
  attention,
];

export const widgetIds: string[] = widgetMetas.map((m) => m.id);

export function findWidgetMeta(id: string): WidgetMeta | undefined {
  return widgetMetas.find((m) => m.id === id);
}
