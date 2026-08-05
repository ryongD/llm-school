/**
 * 콘텐츠 린트 (KICKOFF §4.5) — 배포 게이트의 일부.
 * `npm run build` 체인에서 실행되므로(CP1 C1 반영) 위반 시 exit 1이
 * 로컬 빌드·CI·Vercel 배포를 전부 막는다.
 *
 * §4.5 배포 차단 조건과 담당:
 *   1. frontmatter 스키마 위반           → velite --strict (build 체인 선행 단계)
 *   2. TODO-VERIFY 마커 잔존             → published 에러, 그 외 경고.
 *      마커는 JSX 주석 형식으로 남긴다 — MDX는 HTML 주석을 지원하지 않는다(CP1 C2)
 *   3. widgetId가 레지스트리에 없음       → 에러
 *   4. Term/glossaryTerms 용어 존재       → 에러 (draft 용어는 경고)
 *   5. references 키 존재                → 에러
 *   6. published의 lastVerified          → 에러 (스키마와 이중 방어)
 *   7. 시효성 숫자 하드코딩 휴리스틱        → 경고 (연도 화이트리스트)
 *
 * CP1 리뷰 반영 (2026-08-06):
 *   - C3: 태그 스캔은 코드 펜스·인라인 코드 제거 후 수행 (문서화 콘텐츠 오탐 방지)
 *   - C5: (track, slug) 복합 유일성 검사 — slug 전역 유일성은 velite에서 제거됨
 *   - C6: 챕터 id 중복 / prerequisites / 용어사전 relatedChapters 존재 검사
 *   - C8: facts 파일 _meta.lastVerified 90일 경과 경고 (KICKOFF §4.4)
 */
import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { getAllReferences } from "../src/lib/references";
import { widgetIds } from "../src/widgets/widget-ids";

const ROOT = process.cwd();
const CURRICULUM_DIR = path.join(ROOT, "content", "curriculum");
const GLOSSARY_DIR = path.join(ROOT, "content", "glossary");
const FACTS_DIR = path.join(ROOT, "data", "facts");

const FACTS_STALE_DAYS = 90;

interface Issue {
  level: "error" | "warn";
  file: string;
  rule: string;
  message: string;
}

const issues: Issue[] = [];

function report(level: "error" | "warn", file: string, rule: string, message: string) {
  issues.push({ level, file: path.relative(ROOT, file), rule, message });
}

function walkMdx(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMdx(full));
    else if (entry.name.endsWith(".mdx")) out.push(full);
  }
  return out;
}

/** 코드 펜스(```)와 인라인 코드(`)를 제거한 본문 — 태그·숫자 스캔의 오탐 방지(C3) */
function stripCode(body: string): string {
  return body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

const WIDGET_TAG = /<Widget\b[^>]*\bid=["']([^"']+)["']/g;
const TERM_TAG = /<Term\b[^>]*\bslug=["']([^"']+)["']/g;

// ---------- 데이터 적재 ----------

const references = getAllReferences();

interface MdxEntry {
  file: string;
  raw: string;
  data: Record<string, unknown> & {
    id?: string;
    track?: string;
    slug?: string;
    status?: string;
  };
  content: string;
}

function loadEntries(dir: string): MdxEntry[] {
  return walkMdx(dir).map((file) => {
    const raw = fs.readFileSync(file, "utf-8");
    const { data, content } = matter(raw);
    return { file, raw, data, content };
  });
}

const chapterEntries = loadEntries(CURRICULUM_DIR);
const glossaryEntries = loadEntries(GLOSSARY_DIR);

const glossaryBySlug = new Map(
  glossaryEntries.map((g) => [g.data.slug as string, g]),
);

// 챕터 id 맵 + 중복 검출 (C6-①)
const chapterById = new Map<string, MdxEntry>();
for (const ch of chapterEntries) {
  const id = ch.data.id as string;
  const dup = chapterById.get(id);
  if (dup) {
    report(
      "error",
      ch.file,
      "chapter-id-duplicate",
      `챕터 id '${id}' 가 중복입니다 (먼저 선언된 곳: ${path.relative(ROOT, dup.file)}).`,
    );
  } else {
    chapterById.set(id, ch);
  }
}

// (track, slug) 복합 유일성 (C5 — URL 충돌 방지, 트랙 간 동일 slug는 허용)
const seenTrackSlug = new Map<string, MdxEntry>();
for (const ch of chapterEntries) {
  const key = `${ch.data.track}/${ch.data.slug}`;
  const dup = seenTrackSlug.get(key);
  if (dup) {
    report(
      "error",
      ch.file,
      "track-slug-duplicate",
      `URL '/${key}' 가 중복입니다 (먼저 선언된 곳: ${path.relative(ROOT, dup.file)}).`,
    );
  } else {
    seenTrackSlug.set(key, ch);
  }
}

/** 챕터 id 참조 검사 — 미존재 에러, draft 대상 경고 (Term 정책과 동일, C6) */
function checkChapterRef(
  fromFile: string,
  rule: string,
  refId: string,
  fieldLabel: string,
) {
  const target = chapterById.get(refId);
  if (!target) {
    report(
      "error",
      fromFile,
      rule,
      `${fieldLabel}의 챕터 id '${refId}' 가 존재하지 않습니다.`,
    );
  } else if (target.data.status === "draft") {
    report(
      "warn",
      fromFile,
      rule,
      `${fieldLabel}의 챕터 '${refId}' 는 아직 draft 입니다 — 프로덕션에서는 링크가 렌더되지 않습니다.`,
    );
  }
}

// ---------- 용어사전 검사 ----------

for (const g of glossaryEntries) {
  const basename = path.basename(g.file, ".mdx");
  const slug = g.data.slug as string;
  if (basename !== slug) {
    report(
      "error",
      g.file,
      "glossary-filename",
      `파일명(${basename})과 slug(${slug})가 다릅니다 — 파일명 = slug 규약(§3.4).`,
    );
  }
  if (g.raw.includes("TODO-VERIFY")) {
    report(
      g.data.status === "published" ? "error" : "warn",
      g.file,
      "todo-verify",
      `TODO-VERIFY 마커가 남아 있습니다 (status: ${g.data.status}).`,
    );
  }
  for (const id of (g.data.relatedChapters as string[]) ?? []) {
    checkChapterRef(g.file, "related-chapter", id, "relatedChapters");
  }
}

// ---------- 챕터 검사 ----------

for (const ch of chapterEntries) {
  const { file, raw, data, content } = ch;
  const status = data.status as string;
  const isPublished = status === "published";
  const stripped = stripCode(content);

  // 2. TODO-VERIFY (published 에러 / 그 외 경고 — §4.5-2)
  if (raw.includes("TODO-VERIFY")) {
    report(
      isPublished ? "error" : "warn",
      file,
      "todo-verify",
      `TODO-VERIFY 마커가 남아 있습니다 (status: ${status}).`,
    );
  }

  // 3. widgetId 레지스트리 존재 (§4.5-3)
  const widgetId = data.widgetId as string;
  if (!widgetIds.includes(widgetId)) {
    report(
      "error",
      file,
      "widget-registry",
      `widgetId '${widgetId}' 가 위젯 레지스트리에 없습니다. 등록된 id: ${widgetIds.join(", ")}`,
    );
  }

  // <Widget> 임베드 — 챕터당 정확히 1회 + frontmatter 일치 (원칙 2, §4.2)
  // draft는 집필 중 WIP 상태를 허용해 경고로 완화한다 (§4.5-2와 동일 정책, CP1 제안)
  const widgetTags = [...stripped.matchAll(WIDGET_TAG)];
  if (widgetTags.length !== 1) {
    report(
      status === "draft" ? "warn" : "error",
      file,
      "widget-count",
      `<Widget> 임베드가 ${widgetTags.length}회 — 챕터당 정확히 1회여야 합니다(원칙 2).`,
    );
  }
  for (const tag of widgetTags) {
    if (tag[1] !== widgetId) {
      report(
        "error",
        file,
        "widget-mismatch",
        `<Widget id="${tag[1]}">가 frontmatter widgetId("${widgetId}")와 다릅니다(§4.2).`,
      );
    }
  }

  // 4. Term/glossaryTerms 존재 (§4.5-4 — draft 용어는 경고)
  const termSlugs = new Set<string>([
    ...((data.glossaryTerms as string[]) ?? []),
    ...[...stripped.matchAll(TERM_TAG)].map((m) => m[1]),
  ]);
  for (const slug of termSlugs) {
    const term = glossaryBySlug.get(slug);
    if (!term) {
      report(
        "error",
        file,
        "term-missing",
        `용어 '${slug}' 가 용어사전(content/glossary/)에 없습니다.`,
      );
    } else if (term.data.status === "draft") {
      report(
        "warn",
        file,
        "term-draft",
        `용어 '${slug}' 는 아직 draft 입니다 — 독자에게는 평문으로 렌더됩니다.`,
      );
    }
  }

  // 5. references 키 존재 (§4.5-5)
  for (const key of (data.references as string[]) ?? []) {
    if (!references[key]) {
      report(
        "error",
        file,
        "reference-missing",
        `reference 키 '${key}' 가 data/refs/references.yaml 에 없습니다.`,
      );
    }
  }

  // 6. published의 lastVerified (§4.5-6 — 스키마와 이중 방어)
  if (isPublished && !data.lastVerified) {
    report("error", file, "last-verified", "published 챕터에 lastVerified가 없습니다.");
  }

  // prerequisites 대상 존재 (C6-②)
  for (const id of (data.prerequisites as string[]) ?? []) {
    checkChapterRef(file, "prerequisite", id, "prerequisites");
  }

  // 7. 시효성 숫자 휴리스틱 (§4.5-7 — 경고 수준)
  const numberUnit =
    /(\d{1,3}(?:,\d{3})+|\d{4,})\s*(GB|MB|KB|TB|GiB|MiB|바이트|토큰|개|만|억|원|달러|%|bit|비트|params?|tokens?|년)/gi;
  for (const m of stripped.matchAll(numberUnit)) {
    const value = Number(m[1].replaceAll(",", ""));
    const unit = m[2];
    if (unit === "년" && value >= 1900 && value <= 2100) continue; // 연도 허용
    report(
      "warn",
      file,
      "fact-hardcode",
      `시효성 수치로 보이는 하드코딩: "${m[0]}" — <FactValue>로 옮기는 것을 검토하세요(§4.4). 원리 수치·논문 인용이면 무시해도 됩니다.`,
    );
  }
}

// ---------- facts 신선도 (C8 — KICKOFF §4.4: 90일 초과 시 경고, 차단 아님) ----------

if (fs.existsSync(FACTS_DIR)) {
  for (const file of fs.readdirSync(FACTS_DIR)) {
    if (!file.endsWith(".json")) continue;
    const full = path.join(FACTS_DIR, file);
    try {
      const parsed = JSON.parse(fs.readFileSync(full, "utf-8")) as {
        _meta?: { lastVerified?: string };
      };
      const lastVerified = parsed._meta?.lastVerified;
      if (!lastVerified) {
        report("error", full, "facts-meta", "_meta.lastVerified 가 없습니다 (§4.4).");
        continue;
      }
      const ageDays = Math.floor(
        (Date.now() - new Date(`${lastVerified}T00:00:00`).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (ageDays > FACTS_STALE_DAYS) {
        report(
          "warn",
          full,
          "facts-stale",
          `_meta.lastVerified(${lastVerified})가 ${ageDays}일 경과 — 재검증 리마인더 (§4.4, ${FACTS_STALE_DAYS}일 기준).`,
        );
      }
    } catch {
      report("error", full, "facts-parse", "JSON 파싱 실패.");
    }
  }
}

// ---------- 결과 출력 ----------

const errors = issues.filter((i) => i.level === "error");
const warns = issues.filter((i) => i.level === "warn");

for (const issue of issues) {
  const tag = issue.level === "error" ? "ERROR" : "WARN ";
  console.log(`[${tag}] (${issue.rule}) ${issue.file}\n        ${issue.message}`);
}

console.log(
  `\n콘텐츠 린트: 챕터 ${chapterEntries.length}개, 용어 ${glossaryEntries.length}개 검사 — 에러 ${errors.length}, 경고 ${warns.length}`,
);

if (errors.length > 0) {
  process.exit(1);
}
