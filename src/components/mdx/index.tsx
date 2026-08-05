import type { AnchorHTMLAttributes, HTMLAttributes } from "react";

import type { Chapter } from "#velite";
import { findChapterById, nextChapterOf } from "@/lib/content";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CheckQuestion } from "./CheckQuestion";
import { Depth } from "./Depth";
import { FactValue } from "./FactValue";
import { Figure } from "./Figure";
import type { MDXComponentMap } from "./MDXContent";
import { NextHook } from "./NextHook";
import { Prereq } from "./Prereq";
import { Refs } from "./Refs";
import { Term } from "./Term";
import { Widget } from "./Widget";

/** 외부 링크에 ↗ 병기 + 새 탭 (DESIGN §3.3) */
function MdxLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isExternal = /^https?:\/\//.test(props.href ?? "");
  if (!isExternal) return <a {...props} />;
  return (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {props.children} <span aria-hidden="true">↗</span>
    </a>
  );
}

/** 모바일 3열 초과 표 대비 가로 스크롤 래퍼 (DESIGN §5.6) */
function ScrollTable(props: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="table-scroll">
      <table {...props} />
    </div>
  );
}

/** 챕터 문맥이 필요 없는 공통 매핑 (용어사전 본문 등에서 사용) */
export const baseMdxComponents: MDXComponentMap = {
  Term,
  Depth,
  CheckQuestion,
  Figure,
  FactValue,
  a: MdxLink,
  table: ScrollTable,
};

/**
 * 챕터 본문용 매핑 — frontmatter 문맥(다음 챕터·선수 챕터·참고문헌)을
 * 클로저로 주입한다. 페이지 하단 고정 순서(§9): 확인 질문 → 참고문헌 →
 * 검증 배지 → 다음 챕터 카드. 배지는 Refs에 딸려 렌더된다.
 */
export function chapterMdxComponents(chapter: Chapter): MDXComponentMap {
  const next = nextChapterOf(chapter);
  const prereqItems = chapter.prerequisites
    .map((id) => findChapterById(id))
    .filter((c): c is Chapter => c !== undefined)
    .map((c) => ({ id: c.id, title: c.title, permalink: c.permalink }));

  return {
    ...baseMdxComponents,
    Widget: ({ id }: { id: string }) => {
      if (id !== chapter.widgetId) {
        // frontmatter widgetId와 본문 임베드 불일치 = 빌드 에러 (KICKOFF §4.2)
        throw new Error(
          `[${chapter.id}] <Widget id="${id}">가 frontmatter widgetId("${chapter.widgetId}")와 다릅니다.`,
        );
      }
      return <Widget id={id} />;
    },
    Prereq: () => <Prereq items={prereqItems} />,
    Refs: () => (
      <>
        <Refs referenceKeys={chapter.references} />
        <VerifiedBadge principleDate={chapter.lastVerified} />
      </>
    ),
    NextHook: () => (
      <NextHook
        nextHook={chapter.nextHook}
        next={
          next
            ? { id: next.id, title: next.title, permalink: next.permalink }
            : null
        }
      />
    ),
  };
}
