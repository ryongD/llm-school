import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkMath from "remark-math";
import rehypeShiki from "@shikijs/rehype";
import { createCssVariablesTheme } from "shiki";
import { defineCollection, defineConfig, s } from "velite";

/**
 * 콘텐츠 스키마 — KICKOFF §4.1(챕터)·§4.3(용어사전)을 Zod로 강제한다.
 * 필드 누락·형식 위반은 빌드 에러다. 필드 삭제 금지(세부 조정만 허용).
 *
 * 스키마 밖 교차 검증(위젯 레지스트리·용어 존재·references 키 존재 등)은
 * scripts/lint-content.ts가 담당한다(§4.5).
 */

const isoDate = () =>
  s
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다 (예: 2026-07-07)");

const status = () => s.enum(["draft", "verified", "published"]);

const chapters = defineCollection({
  name: "Chapter",
  pattern: "curriculum/**/*.mdx",
  schema: s
    .object({
      id: s.string(), // 예: "1-1" (파트-챕터)
      track: s.string(), // 트랙 slug — 현재 "llm" 고정. §13 멀티트랙 대비
      slug: s.slug("chapter"), // URL — 예: "token" (컬렉션 내 유일성 검사)
      part: s.number().min(1).max(6),
      order: s.number(),
      title: s.string(), // 예: "토큰: AI가 읽는 글자"
      hook: s.string(), // 훅 질문 1문장
      ahaMoment: s.string(), // 아하 모먼트 1문장 (내부 품질 기준용)
      widgetId: s.string(), // src/widgets/registry.ts에 존재해야 함 — 린트 검사
      prerequisites: s.array(s.string()), // 선수 챕터 id 배열
      nextHook: s.string(), // 다음 챕터로의 연결 질문
      glossaryTerms: s.array(s.string()), // 링크하는 용어 slug — 존재 검사(린트)
      references: s.array(s.string()).min(1), // references.yaml 키 — 존재 검사(린트)
      lastVerified: isoDate(), // 검증 게이트 통과일 — 페이지 배지로 노출
      status: status(), // draft → verified → published (프로덕션은 published만)
      depthLevels: s.array(s.enum(["basic", "dev", "research"])),
      toc: s.toc(), // mini TOC용 (DESIGN §6.1 — h2만 렌더)
      body: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      // URL 규칙(§3.4): 커리큘럼 라우트는 트랙 프리픽스를 갖는다 — /llm/token
      permalink: `/${data.track}/${data.slug}`,
    })),
});

const glossary = defineCollection({
  name: "GlossaryTerm",
  pattern: "glossary/**/*.mdx",
  schema: s.object({
    slug: s.slug("glossary"), // 파일명 = slug 규약(§3.4) — 린트에서 대조
    term: s.string(), // "소프트맥스 (softmax)"
    oneLiner: s.string().max(60), // 팝오버용 1문장 정의 (60자 이내)
    relatedChapters: s.array(s.string()),
    references: s.array(s.string()).min(1),
    lastVerified: isoDate(),
    status: status(),
    body: s.mdx(),
  }),
});

/**
 * Shiki 하이라이트 — CSS 변수 테마 (DESIGN §4.9).
 * 색은 전부 var(--shiki-*)로 출력되고, 그 값은 globals.css에서 디자인 토큰으로
 * 매핑된다 → 라이트(도면지 위 잉크)/다크(청사진) 자동 대응, hex 하드코딩 없음.
 */
const shikiCssVariablesTheme = createCssVariablesTheme({
  name: "css-variables",
  variablePrefix: "--shiki-",
  variableDefaults: {},
  fontStyle: true,
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: { chapters, glossary },
  mdx: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      rehypeSlug,
      rehypeKatex,
      [rehypeShiki, { theme: shikiCssVariablesTheme }],
    ],
  },
});
