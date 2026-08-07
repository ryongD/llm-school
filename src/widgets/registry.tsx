"use client";

/**
 * 위젯 레지스트리 (KICKOFF §3.2) — id → { lazy 컴포넌트, 메타 }.
 * 모든 위젯은 next/dynamic 으로 lazy load 하고, 로딩 중에는
 * 실제 높이와 동일한 스켈레톤을 보여 레이아웃 시프트를 막는다.
 *
 * 노드(린트)용 메타 목록은 widget-ids.ts 에 별도 등록한다.
 */
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import { WidgetSkeleton } from "@/components/widget/WidgetSkeleton";
import { meta as attentionMeta } from "./attention/meta";
import { meta as dummyCounterMeta } from "./dummy-counter/meta";
import { meta as embeddingMapMeta } from "./embedding-map/meta";
import { meta as nextTokenMeta } from "./next-token/meta";
import { meta as tokenizerMeta } from "./tokenizer/meta";
import type { WidgetMeta, WidgetProps } from "./types";

export interface RegistryEntry {
  meta: WidgetMeta;
  Component: ComponentType<WidgetProps>;
}

export const widgetRegistry: Record<string, RegistryEntry> = {
  [dummyCounterMeta.id]: {
    meta: dummyCounterMeta,
    Component: dynamic(() => import("./dummy-counter"), {
      loading: () => <WidgetSkeleton meta={dummyCounterMeta} />,
    }),
  },
  [tokenizerMeta.id]: {
    meta: tokenizerMeta,
    Component: dynamic(() => import("./tokenizer"), {
      loading: () => <WidgetSkeleton meta={tokenizerMeta} />,
    }),
  },
  [nextTokenMeta.id]: {
    meta: nextTokenMeta,
    Component: dynamic(() => import("./next-token"), {
      loading: () => <WidgetSkeleton meta={nextTokenMeta} />,
    }),
  },
  [embeddingMapMeta.id]: {
    meta: embeddingMapMeta,
    Component: dynamic(() => import("./embedding-map"), {
      loading: () => <WidgetSkeleton meta={embeddingMapMeta} />,
    }),
  },
  [attentionMeta.id]: {
    meta: attentionMeta,
    Component: dynamic(() => import("./attention"), {
      loading: () => <WidgetSkeleton meta={attentionMeta} />,
    }),
  },
};
