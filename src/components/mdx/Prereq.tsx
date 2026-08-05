import Link from "next/link";

/**
 * 선수 챕터 안내 상자 (KICKOFF §4.2). 잠금이 아니다 —
 * "알면 더 잘 읽힙니다. 몰라도 괜찮고, 막히면 여기로" 톤.
 * 선수 챕터가 없으면 렌더하지 않는다.
 */
export function Prereq({
  items,
}: {
  items: { id: string; title: string; permalink: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <aside className="my-6 rounded-card border border-hairline bg-inset px-4 py-3 text-sm-token text-ink-600">
      이 챕터는{" "}
      {items.map((item, i) => (
        <span key={item.id}>
          {i > 0 ? ", " : null}
          <Link
            href={item.permalink}
            className="text-jjok-600 underline decoration-1 underline-offset-2"
          >
            {item.title}({item.id})
          </Link>
        </span>
      ))}
      을(를) 알면 더 잘 읽힙니다. 몰라도 괜찮고, 막히면 그때 다녀오세요.
    </aside>
  );
}
