import fs from "node:fs";
import path from "node:path";

/**
 * 시효성 데이터 로더 (KICKOFF §4.4 — data/facts/*.json).
 * 낡을 수 있는 수치는 본문이 아니라 facts 파일에 살고,
 * 본문에서는 <FactValue id="gpt4o.context" /> 로만 참조한다.
 *
 * id 규칙: 파일명을 제외한 점 표기 경로. 첫 세그먼트를 전체 facts 파일의
 * 최상위 키에서 찾는다. 두 파일 이상에서 발견되면 모호성 에러(빌드 실패).
 */

export interface FactMeta {
  lastVerified: string;
  verifiedBy: string;
}

interface FactFile {
  _meta: FactMeta;
  [key: string]: unknown;
}

const FACTS_DIR = path.join(process.cwd(), "data", "facts");

let cache: Map<string, FactFile> | null = null;

function loadFactFiles(): Map<string, FactFile> {
  if (cache) return cache;
  cache = new Map();
  if (!fs.existsSync(FACTS_DIR)) return cache;
  for (const file of fs.readdirSync(FACTS_DIR)) {
    if (!file.endsWith(".json")) continue;
    const raw = fs.readFileSync(path.join(FACTS_DIR, file), "utf-8");
    const data = JSON.parse(raw) as FactFile;
    if (!data._meta?.lastVerified) {
      throw new Error(
        `[facts] ${file} 에 _meta.lastVerified 가 없습니다 (KICKOFF §4.4).`,
      );
    }
    cache.set(file, data);
  }
  return cache;
}

export interface ResolvedFact {
  value: unknown;
  note?: string;
  sourceRef?: string;
  /** 이 값이 담긴 파일의 검증 메타 */
  meta: FactMeta;
  file: string;
}

export function resolveFact(id: string): ResolvedFact {
  const segments = id.split(".");
  if (segments.length < 1 || segments.some((s) => s.length === 0)) {
    throw new Error(`[facts] 잘못된 FactValue id: '${id}'`);
  }
  const files = loadFactFiles();

  const hits: { file: string; data: FactFile }[] = [];
  for (const [file, data] of files) {
    if (segments[0] in data && segments[0] !== "_meta") {
      hits.push({ file, data });
    }
  }
  if (hits.length === 0) {
    throw new Error(
      `[facts] '${id}' 를 data/facts/*.json 에서 찾지 못했습니다 (KICKOFF §4.4).`,
    );
  }
  if (hits.length > 1) {
    throw new Error(
      `[facts] '${id}' 의 최상위 키가 여러 파일에 있습니다: ${hits
        .map((h) => h.file)
        .join(", ")} — 키를 파일 간 중복 없이 유지하세요.`,
    );
  }

  const { file, data } = hits[0];
  let node: unknown = data;
  for (const seg of segments) {
    if (typeof node !== "object" || node === null || !(seg in node)) {
      throw new Error(`[facts] '${id}' 경로가 ${file} 안에서 끊겼습니다 ('${seg}').`);
    }
    node = (node as Record<string, unknown>)[seg];
  }

  // 값 엔트리가 { value, note, sourceRef } 형태면 풀어서 반환, 아니면 원시값
  if (
    typeof node === "object" &&
    node !== null &&
    "value" in (node as Record<string, unknown>)
  ) {
    const entry = node as { value: unknown; note?: string; sourceRef?: string };
    return { value: entry.value, note: entry.note, sourceRef: entry.sourceRef, meta: data._meta, file };
  }
  return { value: node, meta: data._meta, file };
}
