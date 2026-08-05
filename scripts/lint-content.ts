/**
 * 콘텐츠 린트 (KICKOFF §4.5) — CI에서 실행되며 위반은 빌드 실패(exit 1).
 *
 * §4.5 배포 차단 조건과 담당:
 *   1. frontmatter 스키마 위반           → Velite가 자동 처리(이 스크립트 이전 단계)
 *   2. TODO-VERIFY 마커 잔존             → 이 스크립트 (published는 에러, 그 외 경고)
 *   3. widgetId가 레지스트리에 없음       → 이 스크립트
 *   4. Term/glossaryTerms가 용어사전에 없음 → 이 스크립트 (draft 용어는 경고)
 *   5. references 키가 references.yaml에 없음 → 이 스크립트
 *   6. published 챕터의 lastVerified 누락  → 이 스크립트 (스키마와 이중 방어)
 *   7. 시효성 숫자 하드코딩 휴리스틱        → 이 스크립트 (경고 수준, 연도 화이트리스트)
 *
 * 추가 검사(문서 근거):
 *   - <Widget> 챕터당 정확히 1회 + frontmatter widgetId와 일치 (§2 원칙 2, §4.2)
 *   - 용어사전 파일명 = slug 규약 (§3.4)
 */
import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { getAllReferences } from "../src/lib/references";
import { widgetIds } from "../src/widgets/widget-ids";

const ROOT = process.cwd();
const CURRICULUM_DIR = path.join(ROOT, "content", "curriculum");
const GLOSSARY_DIR = path.join(ROOT, "content", "glossary");

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

/** 코드 펜스를 제거한 본문 (휴리스틱 검사의 오탐 방지) */
function stripCodeFences(body: string): string {
  return body.replace(/```[\s\S]*?```/g, "");
}

// ---------- 데이터 적재 ----------

const references = getAllReferences();

const glossaryFiles = walkMdx(GLOSSARY_DIR).map((file) => {
  const { data } = matter(fs.readFileSync(file, "utf-8"));
  return { file, slug: data.slug as string, status: data.status as string };
});
const glossaryBySlug = new Map(glossaryFiles.map((g) => [g.slug, g]));

// ---------- 용어사전 파일 검사 ----------

for (const g of glossaryFiles) {
  const basename = path.basename(g.file, ".mdx");
  if (basename !== g.slug) {
    report(
      "error",
      g.file,
      "glossary-filename",
      `파일명(${basename})과 slug(${g.slug})가 다릅니다 — 파일명 = slug 규약(§3.4).`,
    );
  }
  const raw = fs.readFileSync(g.file, "utf-8");
  if (raw.includes("TODO-VERIFY")) {
    const { data } = matter(raw);
    report(
      data.status === "published" ? "error" : "warn",
      g.file,
      "todo-verify",
      `TODO-VERIFY 마커가 남아 있습니다 (status: ${data.status}).`,
    );
  }
}

// ---------- 챕터 검사 ----------

const chapterFiles = walkMdx(CURRICULUM_DIR);

for (const file of chapterFiles) {
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  const status = data.status as string;
  const isPublished = status === "published";

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
  if (!widgetIds.includes(data.widgetId)) {
    report(
      "error",
      file,
      "widget-registry",
      `widgetId '${data.widgetId}' 가 위젯 레지스트리에 없습니다. 등록된 id: ${widgetIds.join(", ")}`,
    );
  }

  // <Widget> 사용 검사 — 챕터당 정확히 1회 + frontmatter 일치 (§2 원칙 2, §4.2)
  const widgetTags = [...content.matchAll(/<Widget\s+id="([^"]+)"/g)];
  if (widgetTags.length !== 1) {
    report(
      "error",
      file,
      "widget-count",
      `<Widget> 임베드가 ${widgetTags.length}회 — 챕터당 정확히 1회여야 합니다(원칙 2).`,
    );
  }
  for (const tag of widgetTags) {
    if (tag[1] !== data.widgetId) {
      report(
        "error",
        file,
        "widget-mismatch",
        `<Widget id="${tag[1]}">가 frontmatter widgetId("${data.widgetId}")와 다릅니다(§4.2).`,
      );
    }
  }

  // 4. Term/glossaryTerms 존재 (§4.5-4 — draft 용어는 경고)
  const termSlugs = new Set<string>([
    ...(data.glossaryTerms as string[]),
    ...[...content.matchAll(/<Term\s+slug="([^"]+)"/g)].map((m) => m[1]),
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
    } else if (term.status === "draft") {
      report(
        "warn",
        file,
        "term-draft",
        `용어 '${slug}' 는 아직 draft 입니다 — 독자에게는 평문으로 렌더됩니다.`,
      );
    }
  }

  // 5. references 키 존재 (§4.5-5)
  for (const key of data.references as string[]) {
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

  // 7. 시효성 숫자 휴리스틱 (§4.5-7 — 경고 수준)
  //    4자리 이상 숫자(또는 천단위 콤마) + 단위 패턴. 연도(1900~2100 + '년')는 화이트리스트.
  const stripped = stripCodeFences(content);
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

// ---------- 결과 출력 ----------

const errors = issues.filter((i) => i.level === "error");
const warns = issues.filter((i) => i.level === "warn");

for (const issue of issues) {
  const tag = issue.level === "error" ? "ERROR" : "WARN ";
  console.log(`[${tag}] (${issue.rule}) ${issue.file}\n        ${issue.message}`);
}

console.log(
  `\n콘텐츠 린트: 챕터 ${chapterFiles.length}개, 용어 ${glossaryFiles.length}개 검사 — 에러 ${errors.length}, 경고 ${warns.length}`,
);

if (errors.length > 0) {
  process.exit(1);
}
