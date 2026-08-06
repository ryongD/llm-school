import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Link from "next/link";

import { chapterMdxComponents } from "@/components/mdx";
import { MDXContent } from "@/components/mdx/MDXContent";
import { ChapterReadTracker } from "@/components/chapter/ChapterReadTracker";
import { MiniToc } from "@/components/chapter/MiniToc";
import { PartLabel } from "@/components/chapter/PartLabel";
import { findChapterBySlug, findSitePage, visibleChapters } from "@/lib/content";

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

          {/* 첫 챕터 상단 소형 링크 (KICKOFF §7.5) — 일러두기 공개 시에만 */}
          {chapter.id === "1-1" && findSitePage("preface") ? (
            <p className="mt-2 text-caption text-ink-600">
              처음이신가요?{" "}
              <Link
                href="/preface"
                className="text-jjok-600 underline decoration-1 underline-offset-2"
              >
                일러두기
              </Link>
              를 먼저 봐도 좋습니다 — 건너뛰어도 됩니다.
            </p>
          ) : null}

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

        {/* 완독 판정 — 본문 끝 도달 시 진도 기록 (localStorage) */}
        <ChapterReadTracker chapterId={chapter.id} />
      </article>

      <MiniToc items={tocItems} />
    </div>
  );
}
