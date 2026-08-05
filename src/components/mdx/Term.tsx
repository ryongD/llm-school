import type { ReactNode } from "react";

import { findChapterById, findGlossaryTerm } from "@/lib/content";
import { TermPopover } from "./TermPopover";

/**
 * 용어사전 링크 (KICKOFF §4.2·§4.7).
 * 미등재·미공개 용어는 **평문으로 렌더**한다 — 독자에게 스텁·빈 링크를
 * 절대 노출하지 않는다(채집 모드 원칙). published되면 자동으로 살아난다.
 */
export function Term({ slug, children }: { slug: string; children: ReactNode }) {
  const term = findGlossaryTerm(slug);
  if (!term) return <>{children}</>;

  // 개념→챕터 크로스링크 (§7.1): 본격적으로 다루는 챕터가 있으면 병기
  const learnChapter = term.relatedChapters
    .map((id) => findChapterById(id))
    .find((c) => c !== undefined);

  return (
    <TermPopover
      term={term.term}
      oneLiner={term.oneLiner}
      detailHref={`/glossary/${term.slug}`}
      learn={
        learnChapter
          ? {
              label: `본문에서 배우기 → ${learnChapter.id}`,
              href: learnChapter.permalink,
            }
          : undefined
      }
    >
      {children}
    </TermPopover>
  );
}
