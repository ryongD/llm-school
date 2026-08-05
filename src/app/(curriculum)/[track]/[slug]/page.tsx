import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { chapterMdxComponents } from "@/components/mdx";
import { MDXContent } from "@/components/mdx/MDXContent";
import { MiniToc } from "@/components/chapter/MiniToc";
import { PartLabel } from "@/components/chapter/PartLabel";
import { findChapterBySlug, visibleChapters } from "@/lib/content";

/**
 * 챕터 페이지 (DESIGN §6.1).
 * URL 규칙(KICKOFF §3.4): 트랙 프리픽스 — /llm/token.
 * 본문 시작 전 요소 순서 고정: 파트 라벨 → 제목 → 훅 → 본문.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return visibleChapters().map((c) => ({ track: c.track, slug: c.slug }));
}

type Params = Promise<{ track: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { track, slug } = await params;
  const chapter = findChapterBySlug(track, slug);
  if (!chapter) return {};
  return { title: chapter.title, description: chapter.hook };
}

export default async function ChapterPage({ params }: { params: Params }) {
  const { track, slug } = await params;
  const chapter = findChapterBySlug(track, slug);
  if (!chapter) notFound();

  const tocItems = chapter.toc.map((entry) => ({
    title: entry.title,
    url: entry.url,
  }));

  return (
    <div className="mx-auto flex max-w-6xl justify-center gap-8 px-0 py-10 lg:px-6">
      <article className="min-w-0 flex-1">
        <div className="prose-chapter">
          <PartLabel chapter={chapter} />

          {process.env.NODE_ENV !== "production" &&
          chapter.status !== "published" ? (
            <p className="mt-2 rounded-ctl bg-inset px-2 py-1 text-caption text-warn">
              상태: {chapter.status} — 프로덕션 빌드에서 제외됩니다 (개발 모드
              전용 표시)
            </p>
          ) : null}

          <h1 className="mt-3 font-display text-display leading-snug font-bold text-ink-900">
            {chapter.title}
          </h1>

          {/* 훅 인용 (DESIGN §3.3 — 마루 부리, 좌측 2px 쪽빛 룰) */}
          <blockquote className="mt-6">{chapter.hook}</blockquote>
        </div>

        <div className="prose-chapter mt-8">
          <MDXContent
            code={chapter.body}
            components={chapterMdxComponents(chapter)}
          />
        </div>
      </article>

      <MiniToc items={tocItems} />
    </div>
  );
}
