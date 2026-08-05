import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WidgetHost } from "@/components/widget/WidgetHost";
import { WidgetSheet } from "@/components/widget/WidgetSheet";
import { findChapterById } from "@/lib/content";
import { findWidgetMeta, widgetMetas } from "@/widgets/widget-ids";

/**
 * 도구 페이지 (KICKOFF §7.4, DESIGN §6.4).
 * 위젯 도면 시트가 주인공 — 뷰포트 상단 즉시 노출, 서사적 도입 금지.
 * 챕터 임베드와 같은 컴포넌트를 공유한다(§3.2).
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return widgetMetas.filter((m) => m.toolPage).map((m) => ({ id: m.id }));
}

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const meta = findWidgetMeta(id);
  if (!meta) return {};
  return { title: meta.title, description: meta.description };
}

export default async function ToolPage({ params }: { params: Params }) {
  const { id } = await params;
  const meta = findWidgetMeta(id);
  if (!meta || !meta.toolPage) notFound();

  const chapter = meta.chapterId ? findChapterById(meta.chapterId) : undefined;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-h2 font-bold text-ink-900">{meta.title}</h1>

      <WidgetSheet meta={meta}>
        <WidgetHost id={meta.id} />
      </WidgetSheet>

      <p className="mt-4 text-sm-token text-ink-600">{meta.description}</p>

      {chapter ? (
        <Link
          href={chapter.permalink}
          className="mt-6 block rounded-card border border-hairline bg-sheet p-5 no-underline transition-colors duration-(--dur-micro) hover:bg-jjok-100"
        >
          <span className="block text-caption font-semibold text-ink-600">
            원리가 궁금하다면
          </span>
          <span className="mt-1 block text-body text-ink-900">
            {chapter.id} · {chapter.title} <span aria-hidden="true">→</span>
          </span>
        </Link>
      ) : null}
    </div>
  );
}
