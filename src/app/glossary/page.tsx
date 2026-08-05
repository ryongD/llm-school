import type { Metadata } from "next";
import Link from "next/link";

import { visibleGlossary } from "@/lib/content";

/** 용어사전 목록 — Phase 0 골격 (§6.3의 검색·가나다 색인은 Phase 1+) */

export const metadata: Metadata = {
  title: "용어사전",
  description: "LLM 용어를 한 줄 정의와 함께 정리한 용어사전.",
};

export default function GlossaryIndexPage() {
  const terms = [...visibleGlossary()].sort((a, b) =>
    a.term.localeCompare(b.term, "ko"),
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-display text-display font-bold text-ink-900">
        용어사전
      </h1>
      <dl className="mt-8 space-y-5">
        {terms.map((t) => (
          <div key={t.slug}>
            <dt>
              <Link
                href={`/glossary/${t.slug}`}
                className="font-semibold text-jjok-600 underline decoration-1 underline-offset-3"
              >
                {t.term}
              </Link>
            </dt>
            <dd className="mt-1 text-sm-token text-ink-600">{t.oneLiner}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
