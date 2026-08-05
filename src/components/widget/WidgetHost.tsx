"use client";

import { widgetRegistry } from "@/widgets/registry";

/** 레지스트리에서 위젯을 찾아 렌더하는 클라이언트 진입점 */
export function WidgetHost({ id }: { id: string }) {
  const entry = widgetRegistry[id];
  if (!entry) {
    // 서버 측(<Widget>·린트)에서 걸러지므로 여기 도달하면 등록 누락 버그다
    throw new Error(`[widget] 레지스트리에 없는 위젯 id: '${id}'`);
  }
  const { Component } = entry;
  return <Component />;
}
