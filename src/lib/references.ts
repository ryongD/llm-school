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

export function getAllReferences(): Record<string, Reference> {
  if (cache) return cache;
  const raw = fs.readFileSync(REFERENCES_PATH, "utf-8");
  cache = (loadYaml(raw) ?? {}) as Record<string, Reference>;
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
