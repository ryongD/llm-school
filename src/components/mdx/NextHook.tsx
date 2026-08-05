import Link from "next/link";

/**
 * 다음 챕터 훅 카드 (KICKOFF §4.2, DESIGN §4.6).
 * 모든 챕터의 마지막 요소. 카드 전체가 탭 영역이고, 연결 질문(nextHook)이 주인공.
 */
export function NextHook({
  nextHook,
  next,
}: {
  nextHook: string;
  next?: { id: string; title: string; permalink: string } | null;
}) {
  if (!next) return null;

  return (
    <Link
      href={next.permalink}
      className="mt-8 block rounded-card border border-hairline bg-sheet p-6 no-underline transition-colors duration-(--dur-micro) hover:bg-jjok-100"
    >
      <span className="block text-caption font-semibold text-ink-600">
        다음 챕터
      </span>
      <span className="mt-2 block font-display text-hook leading-snug text-ink-900">
        {nextHook}
      </span>
      <span className="mt-3 block text-sm-token text-ink-600">
        {next.id} · {next.title} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
