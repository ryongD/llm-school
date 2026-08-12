import type { Metadata } from "next";
import Link from "next/link";

import { CheckQuestion } from "@/components/mdx/CheckQuestion";
import { Depth } from "@/components/mdx/Depth";
import { FactValue } from "@/components/mdx/FactValue";
import { NextHook } from "@/components/mdx/NextHook";
import { Prereq } from "@/components/mdx/Prereq";
import { Refs } from "@/components/mdx/Refs";
import { Term } from "@/components/mdx/Term";
import { ColorTokenSheet } from "@/components/styleguide/ColorTokenSheet";
import { StampDemo } from "@/components/styleguide/StampDemo";
import { Button } from "@/components/ui/Button";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { WidgetHost } from "@/components/widget/WidgetHost";
import { WidgetSheet } from "@/components/widget/WidgetSheet";
import { WidgetSkeleton } from "@/components/widget/WidgetSkeleton";
import { findWidgetMeta } from "@/widgets/widget-ids";

/**
 * 살아있는 스타일가이드 (DESIGN §9).
 * 운영 규칙: 새 UI 패턴은 여기 등재 없이 챕터에 먼저 등장할 수 없다.
 * 프로덕션 빌드에도 포함한다(공개 무방 — 신뢰 자산).
 */

export const metadata: Metadata = {
  title: "스타일가이드",
  description: "llm-school 디자인 토큰·컴포넌트·위젯 시각 언어의 살아있는 명세.",
};

const TYPE_SCALE = [
  { name: "display (30px) — 챕터 제목 · 마루 부리", cls: "font-display text-display font-bold" },
  { name: "hook (21px) — 훅 인용 · 마루 부리", cls: "font-display text-hook" },
  { name: "h2 (22px)", cls: "text-h2 font-bold" },
  { name: "h3 (18px)", cls: "text-h3 font-bold" },
  { name: "body (17.5px)", cls: "text-body" },
  { name: "sm (15px) — 보조·조작 가이드", cls: "text-sm-token" },
  { name: "caption (13px) — 캡션·배지 · 최소 크기", cls: "text-caption" },
];

const SPACES = [1, 2, 3, 4, 6, 8, 12, 16, 24];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <h2 className="border-b border-hairline pb-2 text-h2 font-bold text-ink-900">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function StyleguidePage() {
  const dummyMeta = findWidgetMeta("dummy-counter");

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="font-display text-display font-bold text-ink-900">
        스타일가이드
      </h1>
      <p className="mt-3 text-body text-ink-600">
        디자인 일관성은 문서가 아니라 코드로 강제한다. 새 UI 패턴은 이 페이지
        등재 없이 챕터에 먼저 등장할 수 없다. 우측 상단 테마 버튼으로
        라이트(도면지)/다크(청사진)를 전환하며 검수한다.
      </p>

      <Section title="1. 색 토큰 — 대비 실측">
        <p className="mb-4 text-sm-token text-ink-600">
          fg/bg 쌍의 WCAG 대비를 현재 테마 기준으로 실측 표기한다 (텍스트 기준
          4.5:1 — DESIGN §8). 테마를 전환하면 자동 재계산된다.
        </p>
        <ColorTokenSheet />
        <p className="mt-3 text-caption text-ink-400">
          ink-400 캡션은 본문 크기 사용 금지 토큰이다(§2.1) — 13px 캡션
          전용으로만 쓴다.
        </p>
      </Section>

      <Section title="2. 타이포그래피 스케일">
        <ul className="space-y-4">
          {TYPE_SCALE.map((t) => (
            <li key={t.name}>
              <p className="text-caption text-ink-400">{t.name}</p>
              <p className={`${t.cls} text-ink-900`}>
                도면 위의 잉크, 청사진 위의 빛
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="3. 간격 자 (4px 스케일)">
        <ul className="space-y-2">
          {SPACES.map((n) => (
            <li key={n} className="flex items-center gap-3">
              <span className="w-14 text-caption text-ink-600 tabular">
                sp-{n}
              </span>
              <span
                className="block h-3 bg-jjok-200"
                style={{ width: `var(--sp-${n})` }}
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="4. 버튼·입력 기본형 (§4.10)">
        <div className="flex flex-wrap items-center gap-4">
          <Button>기본 동작</Button>
          <Button disabled>비활성</Button>
          <Button variant="ghost">보조 동작</Button>
        </div>
      </Section>

      <Section title="5. MDX 컴포넌트 — 실물 상태">
        <div className="space-y-8">
          <div>
            <p className="mb-2 text-caption text-ink-400">
              Term — 점선 밑줄, 탭/Enter 열림·Esc 닫힘
            </p>
            <p className="text-body">
              본문 속 용어는 이렇게 표시된다:{" "}
              <Term slug="token">토큰</Term> (미등재 용어는 평문으로
              렌더된다).
            </p>
          </div>

          <div>
            <p className="mb-2 text-caption text-ink-400">
              Depth — 접힘 기본, 좌측 룰로 레벨 구분
            </p>
            <Depth level="dev" hint="이 카드는 더 깊이 보고 싶을 때만 열면 됩니다">
              <p>개발자 레이어 내부는 본문과 동일 조판을 쓴다.</p>
            </Depth>
            <Depth level="research">
              <p>연구 레이어 — 원문 인용은 15단어 미만 + 출처 링크가 규칙이다.</p>
            </Depth>
          </div>

          <div>
            <p className="mb-2 text-caption text-ink-400">CheckQuestion</p>
            <CheckQuestion answer="탭하면 답이 펼쳐진다. 채점은 없다 — 부담 최소화가 목적이다.">
              이 확인 질문 카드의 목적은 무엇인가?
            </CheckQuestion>
          </div>

          <div>
            <p className="mb-2 text-caption text-ink-400">
              FactValue — 시효성 수치 (탭하면 검증일·출처)
            </p>
            <p className="text-body">
              컴포넌트 표본 수치: <FactValue id="dummy.answer" />
            </p>
          </div>

          <div>
            <p className="mb-2 text-caption text-ink-400">Prereq</p>
            <Prereq
              items={[
                {
                  id: "1-1",
                  title: "토큰: AI가 읽는 글자",
                  permalink: "/llm/token",
                },
              ]}
            />
          </div>

          <div>
            <p className="mb-2 text-caption text-ink-400">
              Refs + 검증 배지 — 신뢰 UI 2종 세트
            </p>
            <Refs referenceKeys={["vaswani2017"]} />
            <VerifiedBadge principleDate="2026-08-05" />
          </div>

          <div>
            <p className="mb-2 text-caption text-ink-400">NextHook 카드</p>
            <NextHook
              nextHook="다음 챕터로 이어지는 연결 질문이 카드의 주인공이다."
              next={{
                id: "1-2",
                title: "다음 토큰 맞히기: LLM의 유일한 일",
                permalink: "/llm/next-token",
              }}
            />
          </div>
        </div>
      </Section>

      <Section title="6. 인주 도장 (시그니처 — §1.2)">
        <p className="mb-4 text-sm-token text-ink-600">
          인주색은 도장·검증 표식 외 사용 금지(§1.3-6). 도장은 아껴 찍는다.
          스탬프 내부 글리프는 결정 대기(D9) — 임시 추상 인장.
        </p>
        <StampDemo />
      </Section>

      <Section title="7. 위젯 도면 시트 (§5.1)">
        {dummyMeta ? (
          <>
            <WidgetSheet meta={dummyMeta}>
              <WidgetHost id={dummyMeta.id} />
            </WidgetSheet>
            <p className="mb-2 text-caption text-ink-400">
              스켈레톤 실물 (동일 높이 고정 — CLS 0):
            </p>
            <div className="rounded-sheet border border-hairline-strong bg-sheet">
              <div className="widget-grid-bg">
                <WidgetSkeleton meta={dummyMeta} />
              </div>
            </div>
            <p className="mt-3 text-caption text-ink-400">
              첫 노출 힌트(§5.3)는 Phase 1 실위젯 구현과 함께 등재 예정.
            </p>
          </>
        ) : null}
      </Section>

      <Section title="8. 콘텐츠 시맨틱 팔레트 (§2.3)">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-caption text-ink-400">
              토큰 블록 6색 순환 — 인접 블록 동일색 금지
            </p>
            <div className="flex flex-wrap gap-1">
              {["읽지", "말고", "만지", "면서", "배우", "세요"].map((w, i) => (
                <span
                  key={i}
                  className="rounded-ctl px-2 py-1 font-mono text-sm-token"
                  style={{
                    backgroundColor: `var(--tk-${i + 1}-bg)`,
                    color: `var(--tk-${i + 1}-fg)`,
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-caption text-ink-400">
              어텐션 세기 — 단일 색 + 투명도·굵기 이중 인코딩 (색상만으로 구분
              금지)
            </p>
            <svg
              viewBox="0 0 240 40"
              width="240"
              height="40"
              role="img"
              aria-label="어텐션 세기 범례: 약함은 얇고 옅은 선, 강함은 굵고 진한 선"
            >
              <line x1="10" y1="10" x2="70" y2="10" stroke="var(--attn-hue)" strokeWidth="1" opacity="0.15" />
              <line x1="10" y1="20" x2="70" y2="20" stroke="var(--attn-hue)" strokeWidth="2.5" opacity="0.55" />
              <line x1="10" y1="30" x2="70" y2="30" stroke="var(--attn-hue)" strokeWidth="4" opacity="1" />
              <text x="80" y="14" fontSize="13" fill="var(--ink-600)">약</text>
              <text x="80" y="24" fontSize="13" fill="var(--ink-600)">중</text>
              <text x="80" y="34" fontSize="13" fill="var(--ink-600)">강</text>
            </svg>
          </div>

          <div>
            <p className="mb-2 text-caption text-ink-400">
              판정 3색 — 반드시 텍스트 병기 (색 단독 전달 금지)
            </p>
            <div className="flex flex-wrap gap-4 text-sm-token">
              <span className="text-ok">● 여유 있음</span>
              <span className="text-warn">● 빠듯함</span>
              <span className="text-err">● 불가</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-caption text-ink-400">
              확률 막대 — 값 라벨은 tabular, 최댓값 강조는 굵기로 (표시 예시 —
              실데이터 아님)
            </p>
            <div className="max-w-xs space-y-1">
              {[
                { label: "후보 A", v: 62, top: true },
                { label: "후보 B", v: 27, top: false },
                { label: "후보 C", v: 11, top: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="w-14 text-caption text-ink-600">
                    {row.label}
                  </span>
                  <div className="h-4 flex-1 rounded-ctl" style={{ backgroundColor: "var(--bar-track)" }}>
                    <div
                      className="h-full rounded-ctl"
                      style={{ width: `${row.v}%`, backgroundColor: "var(--bar-fill)" }}
                    />
                  </div>
                  <span
                    className={`w-10 text-right text-caption tabular ${row.top ? "font-semibold" : ""}`}
                  >
                    {row.v}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="9. 조판 샘플">
        <p className="text-sm-token text-ink-600">
          챕터 전 요소(제목~NextHook)의 조판 표본은{" "}
          <Link
            href="/llm/token"
            className="text-jjok-600 underline decoration-1 underline-offset-3"
          >
            1-1 토큰
          </Link>
          이 담당한다 — 파일럿 첫 공개분이라 동결 기준 표본을 겸한다.
        </p>
      </Section>
    </div>
  );
}
