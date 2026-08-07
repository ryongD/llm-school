import type { Metadata, Viewport } from "next";

import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "katex/dist/katex.min.css";
import "@/styles/globals.css";

import { CollectMode } from "@/components/collect/CollectMode";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: {
    default: "llm-school (가칭) — LLM을 만지면서 배우는 곳",
    template: "%s · llm-school (가칭)",
  },
  description:
    "LLM을 기초부터 심화까지, 읽는 게 아니라 만지면서 배우는 한국어 학습 사이트.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * 테마 초기화 — 페인트 전에 data-theme을 확정해 FOUC를 막는다.
 * localStorage("theme")가 없으면 시스템 설정을 따른다(DESIGN §11.1).
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <CollectMode />
      </body>
    </html>
  );
}
