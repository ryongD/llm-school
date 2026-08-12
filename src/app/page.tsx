import Link from "next/link";

import { ContinueCard } from "@/components/home/ContinueCard";
import { ReadStamp } from "@/components/home/ReadStamp";
import { WidgetHost } from "@/components/widget/WidgetHost";
import { WidgetSheet } from "@/components/widget/WidgetSheet";
import { curriculumChapters, findSitePage } from "@/lib/content";
import { PART_CONNECTIONS, PART_NAMES, partColorVar } from "@/lib/curriculum";
import { findWidgetMeta } from "@/widgets/widget-ids";
import type { Chapter } from "#velite";

/**
 * 홈 = 커리큘럼 맵 (DESIGN §6.2). 별도 소개 랜딩 없음 — 홈 자체가 지도다.
 * 섹션 순서 고정: (이어가기 — 진도 저장 구현 후) → 히어로(논지+시연) →
 * 커리큘럼 맵(일러두기 카드 → 파트 → 연결 질문) → 지름길 → 신뢰 스트립.
 * 금지: 마케팅 랜딩 문법(후기·뉴스레터·통계 카드·로고 스트립).
 */

function ChapterCard({ chapter }: { chapter: Chapter }) {
  return (
    <Link
      href={chapter.permalink}
      className="relative block rounded-card border border-hairline bg-sheet p-5 no-underline transition-colors duration-(--dur-micro) hover:bg-jjok-100"
    >
      {/* 훅 질문이 카드 문구 — 마루 부리 17px (DESIGN §4.8) */}
      <span className="block font-display text-[17px] leading-relaxed text-ink-900">
        {chapter.hook}
      </span>
      <span className="mt-2 block text-caption text-ink-600">
        {chapter.id} · {chapter.title}
      </span>
      {/* 완독 시 우상단 인주 스탬프 (§1.2) */}
      <ReadStamp chapterId={chapter.id} />
    </Link>
  );
}

export default function HomePage() {
  const chapters = curriculumChapters();
  const preface = findSitePage("preface");
  const tokenizerMeta = findWidgetMeta("w-tokenizer");
  const firstChapter = chapters[0];

  const parts = [...new Set(chapters.map((c) => c.part))].sort((a, b) => a - b);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      {/* ===== 이어가기 카드 (§6.2-1) — 재방문자 전용, 히어로보다 위 ===== */}
      <ContinueCard
        chapters={chapters.map((c) => ({
          id: c.id,
          title: c.title,
          permalink: c.permalink,
        }))}
      />

      {/* ===== 히어로 — 정체 + 시연 (§6.2-2, DESIGN v1.3) =====
          첫 화면이 "여기가 뭐 하는 곳인가"에 답해야 한다. 구 문구는 실독
          테스트 2회 연속 실패 — 근거는 DESIGN §6.2 개정 노트 참조. */}
      <section>
        {/* 사용자 어휘로 앵커링 — 'LLM'으로 시작하면 첫 단어에서 막힌다 */}
        <h1 className="font-display text-display leading-snug font-bold text-ink-900">
          ChatGPT는 속으로
          <br />
          무슨 생각을 할까?
        </h1>
        {/* 훅이 부른 통념('생각')을 바로 다음 문장이 받아친다 — 의인화를
            사실로 깔지 않으면서 궁금증은 살린다 (KICKOFF §11.3) */}
        <p className="mt-4 text-body text-ink-600">
          열어보면 <span className="text-ink-900">생각보다 단순한 계산</span>이
          돌아갑니다. 여기서는 그걸 글로 설명하지 않습니다. 직접 만져보면서
          확인합니다. 수학도 코딩도 몰라도 됩니다.
        </p>

        {/* 설명 대신 시연이 첫인상 — 단, 무엇의 시연인지 한 줄 먼저 (§6.2-2) */}
        <p className="mt-6 text-sm-token text-ink-600">
          예를 들어 AI는 글을 이런 조각으로 잘라서 읽습니다. 아무 말이나
          넣어보세요.
        </p>
        {tokenizerMeta ? (
          <WidgetSheet meta={tokenizerMeta}>
            <WidgetHost id={tokenizerMeta.id} />
          </WidgetSheet>
        ) : null}

        <p className="mt-2 text-body text-ink-900">
          읽지 말고 만지면서 배우세요.
          {firstChapter ? (
            <>
              {" "}
              <Link
                href={firstChapter.permalink}
                className="text-jjok-600 underline decoration-1 underline-offset-3"
              >
                1챕터 시작 →
              </Link>
            </>
          ) : null}
        </p>
      </section>

      {/* ===== 커리큘럼 맵 (§6.2-3) ===== */}
      <section className="mt-16">
        {preface ? (
          <Link
            href="/preface"
            className="block rounded-card border border-hairline bg-inset px-4 py-3 text-sm-token text-ink-600 no-underline transition-colors duration-(--dur-micro) hover:bg-jjok-100"
          >
            처음이신가요? <span className="text-jjok-600">일러두기</span>를 먼저
            봐도 좋습니다 — 건너뛰어도 됩니다.
          </Link>
        ) : null}

        {parts.map((part, idx) => (
          <div key={part} className="mt-8">
            <h2
              className="font-display text-h3 font-bold"
              style={{ color: partColorVar(part) }}
            >
              파트 {part} · {PART_NAMES[part]}
            </h2>
            <div className="mt-3 space-y-3">
              {chapters
                .filter((c) => c.part === part)
                .map((c) => (
                  <ChapterCard key={c.id} chapter={c} />
                ))}
            </div>

            {/* 파트 사이 연결 질문 — 맵 자체가 서사를 예고 (§6 서사 구조).
                다음 파트가 공개된 경우에만 렌더(미완성 비노출 §4.7) */}
            {parts[idx + 1] === part + 1 && PART_CONNECTIONS[part] ? (
              <div className="mt-6 flex items-center gap-4">
                <span className="h-px flex-1 bg-hairline" />
                <span className="font-display text-sm-token text-ink-600">
                  {PART_CONNECTIONS[part]}
                </span>
                <span className="h-px flex-1 bg-hairline" />
              </div>
            ) : null}
          </div>
        ))}
      </section>

      {/* ===== 지름길 스트립 (§6.2-4) — 담백한 텍스트 링크 카드 ===== */}
      <section className="mt-16 grid gap-3 sm:grid-cols-2">
        <Link
          href="/tools/tokenizer"
          className="rounded-card border border-hairline bg-sheet p-4 no-underline transition-colors duration-(--dur-micro) hover:bg-jjok-100"
        >
          <span className="block text-sm-token font-semibold text-ink-900">
            한국어 토큰 계산기
          </span>
          <span className="mt-1 block text-caption text-ink-600">
            문장이 토큰 몇 개인지 바로 계산
          </span>
        </Link>
        <Link
          href="/glossary"
          className="rounded-card border border-hairline bg-sheet p-4 no-underline transition-colors duration-(--dur-micro) hover:bg-jjok-100"
        >
          <span className="block text-sm-token font-semibold text-ink-900">
            용어사전
          </span>
          <span className="mt-1 block text-caption text-ink-600">
            낯선 용어를 한 줄 정의로
          </span>
        </Link>
      </section>

      {/* ===== 신뢰 스트립 (§6.2-5) ===== */}
      <section className="mt-16 flex items-center gap-3 border-t border-hairline pt-6">
        <svg
          viewBox="0 0 14 14"
          width="14"
          height="14"
          aria-hidden="true"
          className="shrink-0 text-inju-500"
        >
          <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="7" cy="7" r="2.5" fill="currentColor" />
        </svg>
        <p className="text-caption text-ink-600">
          모든 챕터는 원 논문을 근거로 쓰고, 검증일을 표기합니다.
          {preface ? (
            <>
              {" "}
              <Link
                href="/preface"
                className="text-jjok-600 underline decoration-1 underline-offset-2"
              >
                정확성 약속 →
              </Link>
            </>
          ) : null}
        </p>
      </section>
    </div>
  );
}
