import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { baseMdxComponents } from "@/components/mdx";
import { MDXContent } from "@/components/mdx/MDXContent";
import { Refs } from "@/components/mdx/Refs";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { findChapterById, findGlossaryTerm, visibleGlossary } from "@/lib/content";

/** 용어 상세 페이지 — 본문 조판 동일 + 역링크 (§6.3 골격) */

export const dynamicParams = false;

export function generateStaticParams() {
  return visibleGlossary().map((t) => ({ slug: t.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const term = findGlossaryTerm(slug);
  if (!term) return {};
  return { title: term.term, description: term.oneLiner };
}

export default async function GlossaryTermPage({ params }: { params: Params }) {
  const { slug } = await params;
  const term = findGlossaryTerm(slug);
  if (!term) notFound();

  const related = term.relatedChapters
    .map((id) => findChapterById(id))
    .filter((c) => c !== undefined);

  return (
    <div className="prose-chapter py-10">
      <h1 className="font-display text-display font-bold text-ink-900">
        {term.term}
      </h1>
      <p className="mt-2 text-body text-ink-600">{term.oneLiner}</p>

      <div className="mt-8">
        <MDXContent code={term.body} components={baseMdxComponents} />
      </div>

      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-h3 font-bold text-ink-900">
            이 용어가 등장하는 챕터
          </h2>
          <ul className="mt-3 space-y-1">
            {related.map((c) => (
              <li key={c.id}>
                <Link
                  href={c.permalink}
                  className="text-sm-token text-jjok-600 underline decoration-1 underline-offset-3"
                >
                  {c.id} · {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Refs referenceKeys={term.references} />
      <VerifiedBadge principleDate={term.lastVerified} />
    </div>
  );
}
