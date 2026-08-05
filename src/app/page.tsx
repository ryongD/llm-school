import Link from "next/link";

import { visibleChapters } from "@/lib/content";
import { PART_NAMES, partColorVar } from "@/lib/curriculum";

/**
 * 홈 — Phase 0 자리 표시 골격.
 * 실제 홈(이어가기 카드 + 히어로 + 커리큘럼 맵, DESIGN §6.2)은 Phase 1에서.
 */
export default function HomePage() {
  const chapters = visibleChapters();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-display leading-snug font-bold text-ink-900">
        읽지 말고 만지면서 배우세요
      </h1>
      <p className="mt-3 text-body text-ink-600">
        LLM을 기초부터 심화까지 다루는 한국어 인터랙티브 학습 사이트 — 준비
        중입니다.
      </p>

      {chapters.length > 0 ? (
        <ul className="mt-10 space-y-3">
          {chapters.map((c) => (
            <li key={c.id}>
              <Link
                href={c.permalink}
                className="block rounded-card border border-hairline bg-sheet p-4 no-underline transition-colors duration-(--dur-micro) hover:bg-jjok-100"
              >
                <span
                  className="block text-caption font-medium"
                  style={{ color: partColorVar(c.part) }}
                >
                  파트 {c.part} · {PART_NAMES[c.part]} — {c.id}
                </span>
                <span className="mt-1 block font-display text-h3 text-ink-900">
                  {c.hook}
                </span>
                <span className="mt-1 block text-sm-token text-ink-600">
                  {c.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <nav className="mt-12 flex flex-wrap gap-4 border-t border-hairline pt-6 text-sm-token">
        <Link href="/glossary" className="text-jjok-600 underline underline-offset-3">
          용어사전
        </Link>
        <Link href="/styleguide" className="text-jjok-600 underline underline-offset-3">
          스타일가이드
        </Link>
      </nav>
    </div>
  );
}
