import Link from "next/link";

import { ThemeToggle } from "@/components/ThemeToggle";

/** 최소 헤더 — Phase 0 골격. 내비게이션 확장은 Phase 1(커리큘럼 맵)에서. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-(--z-header) border-b border-hairline bg-page">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <Link
          href="/"
          className="font-display text-h3 font-bold text-ink-900 no-underline"
        >
          llm-school
          <span className="ml-2 align-middle text-caption font-normal text-ink-400">
            가칭
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/styleguide"
            className="text-sm-token text-ink-600 hover:text-jjok-600"
          >
            스타일가이드
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
