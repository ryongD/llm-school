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
      id: s.string(), // 예: "1-1" (파트-챕터) — 중복은 lint가 검사(CP1 C6)
      track: s.string(), // 트랙 slug — 현재 "llm" 고정. §13 멀티트랙 대비
      // URL — 예: "token". 유일성은 (track, slug) 복합으로 lint가 검사한다.
      // s.slug()의 전역 유일성은 §13 URL 규칙(/llm/embedding과 /dl/embedding
      // 공존)과 모순이라 제거했다 (CP1 C5).
      slug: s
        .string()
        .regex(/^[a-z0-9-]+$/, "slug는 소문자·숫자·하이픈만 허용합니다"),
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
      raw: s.raw(), // factIds 추출용 — transform에서 제거되고 출력에 남지 않는다
    })
    .transform((data) => {
      // 본문이 사용한 <FactValue id> 목록 → 검증 배지의 "수치 데이터 검증일"
      // 배선에 쓴다 (CP1 C7). 코드 펜스·인라인 코드는 제외(예시 오탐 방지).
      const { raw, ...rest } = data;
      const stripped = raw
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`[^`\n]*`/g, "");
      const factIds = [
        ...new Set(
          [...stripped.matchAll(/<FactValue\b[^>]*\bid=["']([^"']+)["']/g)].map(
            (m) => m[1],
          ),
        ),
      ];
      return {
        ...rest,
        factIds,
        // URL 규칙(§3.4): 커리큘럼 라우트는 트랙 프리픽스를 갖는다 — /llm/token
        permalink: `/${data.track}/${data.slug}`,
      };
    }),
});

/**
 * 단일 페이지 (일러두기 등) — 챕터 스키마가 아닌 별도 페이지 (KICKOFF §7.5).
 * references 최소 1개 규칙의 명시적 예외. 상태 전이·게이트는 동일 적용.
 */
const sitePages = defineCollection({
  name: "SitePage",
  pattern: "pages/**/*.mdx",
  schema: s.object({
    slug: s.slug("page"),
    title: s.string(),
    description: s.string(),
    lastVerified: isoDate(),
    status: status(),
    body: s.mdx(),
  }),
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
  collections: { chapters, glossary, sitePages },
  mdx: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      rehypeSlug,
      rehypeKatex,
      [rehypeShiki, { theme: shikiCssVariablesTheme }],
    ],
  },
});
