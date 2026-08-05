"use client";

import { useEffect, useState } from "react";

/**
 * 우측 mini TOC (DESIGN §6.1) — lg 이상에서만, h2만, 현재 섹션 쪽빛 표시.
 */
export interface TocEntry {
  title: string;
  url: string; // "#heading-id"
}

export function MiniToc({ items }: { items: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const headings = items
      .map((i) => document.getElementById(i.url.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="이 페이지의 목차"
      className="sticky top-20 hidden max-h-[70vh] w-52 shrink-0 overflow-y-auto lg:block"
      style={{ zIndex: "var(--z-toc)" }}
    >
      <ul className="space-y-2 border-l border-hairline pl-4">
        {items.map((item) => {
          const active = activeId === item.url.slice(1);
          return (
            <li key={item.url}>
              <a
                href={item.url}
                className={`block text-sm-token no-underline transition-colors duration-(--dur-micro) ${
                  active ? "font-medium text-jjok-600" : "text-ink-600"
                }`}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
