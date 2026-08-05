import fs from "node:fs";
import path from "node:path";

import { load as loadYaml } from "js-yaml";

/**
 * 전역 참고문헌 DB 로더 (KICKOFF §5.1 — data/refs/references.yaml).
 * 서버(빌드 타임) 전용. <Refs /> 와 콘텐츠 린트가 공유한다.
 */

export type ReferenceGrade = "S1" | "S2" | "S3";

export interface Reference {
  type: "paper" | "docs" | "secondary";
  title: string;
  authors: string;
  year: number;
  url: string;
  grade: ReferenceGrade;
}

const REFERENCES_PATH = path.join(
  process.cwd(),
  "data",
  "refs",
  "references.yaml",
);

let cache: Record<string, Reference> | null = null;

/**
 * 항목 형태 검증 (CP1 제안 반영) — 신뢰 UI의 핵심 1이므로 grade 오타·url 누락이
 * 빈 칩으로 조용히 렌더되지 않게 로드 시점에 막는다. 이 로더를 빌드(Refs)와
 * 린트가 공유하므로 위반은 곧 빌드·배포 실패다.
 */
function assertReference(key: string, ref: unknown): asserts ref is Reference {
  const problems: string[] = [];
  const r = ref as Partial<Reference> | null;
  if (!r || typeof r !== "object") {
    problems.push("항목이 객체가 아님");
  } else {
    if (!["paper", "docs", "secondary"].includes(r.type as string))
      problems.push(`type이 paper|docs|secondary가 아님: '${r.type}'`);
    if (typeof r.title !== "string" || r.title.length === 0)
      problems.push("title 누락");
    if (typeof r.authors !== "string" || r.authors.length === 0)
      problems.push("authors 누락");
    if (typeof r.year !== "number") problems.push("year는 숫자여야 함");
    if (typeof r.url !== "string" || !/^https?:\/\//.test(r.url))
      problems.push("url이 http(s) URL이 아님");
    if (!["S1", "S2", "S3"].includes(r.grade as string))
      problems.push(`grade가 S1|S2|S3이 아님: '${r.grade}' (X는 등재 금지 — §5.1)`);
  }
  if (problems.length > 0) {
    throw new Error(
      `[references] '${key}' 항목이 잘못됐습니다: ${problems.join(", ")}`,
    );
  }
}

export function getAllReferences(): Record<string, Reference> {
  if (cache) return cache;
  const raw = fs.readFileSync(REFERENCES_PATH, "utf-8");
  const parsed = (loadYaml(raw) ?? {}) as Record<string, unknown>;
  for (const [key, ref] of Object.entries(parsed)) {
    assertReference(key, ref);
  }
  cache = parsed as Record<string, Reference>;
  return cache;
}

/** 존재하지 않는 키는 빌드 실패로 이어져야 한다(§4.5-5). */
export function getReference(key: string): Reference {
  const all = getAllReferences();
  const ref = all[key];
  if (!ref) {
    throw new Error(
      `[references] '${key}' 가 data/refs/references.yaml 에 없습니다 (KICKOFF §4.5-5).`,
    );
  }
  return ref;
}
