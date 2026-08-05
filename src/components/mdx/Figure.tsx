import type { ReactNode } from "react";

/**
 * 정적 그림·다이어그램·표 래퍼 (KICKOFF §4.2·§4.6, DESIGN §5.6).
 * - 캡션 필수. 이미지는 alt 필수(누락 시 빌드 실패).
 * - 다이어그램(children으로 받은 인라인 SVG)은 본문 폭 유지 — 브레이크아웃은
 *   위젯 전용이고, 모눈 금지("보는 도면" vs "만지는 도면"의 구분).
 * - 이미지는 직접 캡처한 실증만(§4.6-3) — capturedAt으로 캡처 일자 표기.
 */
export function Figure({
  src,
  alt,
  caption,
  capturedAt,
  children,
}: {
  src?: string;
  alt?: string;
  caption: string;
  capturedAt?: string;
  children?: ReactNode;
}) {
  if (!caption) {
    throw new Error("[<Figure>] caption은 필수다 (KICKOFF §4.6).");
  }
  if (src && !alt) {
    throw new Error(`[<Figure src="${src}">] 이미지 alt는 필수다 (DESIGN §8).`);
  }

  return (
    <figure className="my-8">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="w-full rounded-card border border-hairline-strong"
        />
      ) : (
        children
      )}
      <figcaption className="mt-2 text-caption text-ink-600">
        {caption}
        {capturedAt ? ` (캡처: ${capturedAt})` : null}
      </figcaption>
    </figure>
  );
}
