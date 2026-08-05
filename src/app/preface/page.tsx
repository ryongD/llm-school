import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { baseMdxComponents } from "@/components/mdx";
import { MDXContent } from "@/components/mdx/MDXContent";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { findSitePage } from "@/lib/content";

/**
 * 일러두기 (KICKOFF §7.5) — 챕터 0이 아니라 건너뛰어도 되는 5분짜리 문.
 * 본문 최상단의 "바로 1챕터로 가도 됩니다"가 이 페이지의 첫 문장이다.
 */

export function generateMetadata(): Metadata {
  const page = findSitePage("preface");
  if (!page) return {};
  return { title: page.title, description: page.description };
}

export default function PrefacePage() {
  const page = findSitePage("preface");
  if (!page) notFound();

  return (
    <div className="prose-chapter py-10">
      <h1 className="font-display text-display font-bold text-ink-900">
        {page.title}
      </h1>
      <div className="mt-8">
        <MDXContent code={page.body} components={baseMdxComponents} />
      </div>
      <VerifiedBadge principleDate={page.lastVerified} />
    </div>
  );
}
