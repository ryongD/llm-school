/**
 * w-tokenizer 계산 로직 — UI와 분리된 순수 계층 (KICKOFF §3.2, §8.2.1).
 *
 * 구현 노트(정확성):
 * - 토큰 조각은 gpt-tokenizer의 bpeRanks 테이블(토큰 id → 원시 바이트)로 만든다.
 *   라이브러리의 decode()는 호출 간 UTF-8 스트림 상태를 유지해(부분 바이트 버퍼링)
 *   단일 토큰 디코드 용도로는 결과가 이전 호출에 오염된다 — 실측으로 확인함.
 * - 바이트 조각(단독으로 유효한 UTF-8이 아닌 토큰)은 text: null 로 구분한다.
 *   한글이 글자 중간에서 쪼개지는 현상 자체가 1-1의 교육 포인트다.
 * - 인코딩 사전 데이터는 무겁다(gzip: o200k 약 1.02MB, cl100k 약 435KB —
 *   gpt-tokenizer@3.4.0 실측). §3.5 위젯 청크 예산(80KB)은 코드에만 적용하고
 *   사전은 인코딩별 지연 로딩 청크로 분리한다. 예산 조항 처리는 재성 결정 대기.
 */

export type EncodingId = "o200k_base" | "cl100k_base";

export const ENCODINGS: { id: EncodingId; label: string; note: string }[] = [
  { id: "o200k_base", label: "o200k_base", note: "GPT-4o 이후 기본" },
  { id: "cl100k_base", label: "cl100k_base", note: "GPT-3.5/4 세대" },
];

/** 입력 절단 한도 (§8.2.1 — 5,000자 초과 시 절단 안내) */
export const MAX_INPUT_CHARS = 5000;

export interface TokenPiece {
  /** 토큰 id */
  id: number;
  /** 시퀀스 내 순번 */
  index: number;
  /** 단독으로 유효한 UTF-8이면 그 문자열, 바이트 조각이면 null */
  text: string | null;
  /** 원시 바이트 */
  bytes: number[];
}

export interface TokenizeResult {
  ids: number[];
  pieces: TokenPiece[];
  tokenCount: number;
  /** 유니코드 코드포인트 기준 글자 수 */
  charCount: number;
  /** 글자당 토큰 비율 (charCount 0이면 0) */
  tokensPerChar: number;
}

export interface Tokenizer {
  encodingId: EncodingId;
  vocabularySize: number;
  tokenize(text: string): TokenizeResult;
}

export function clampInput(text: string): { text: string; truncated: boolean } {
  const chars = [...text];
  if (chars.length <= MAX_INPUT_CHARS) return { text, truncated: false };
  return { text: chars.slice(0, MAX_INPUT_CHARS).join(""), truncated: true };
}

export function formatBytes(bytes: number[]): string {
  return bytes
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

/** 두 결과의 토큰 수 비율 (b 기준 a가 몇 배인지 — b가 0이면 null) */
export function tokenRatio(a: number, b: number): number | null {
  if (b === 0) return null;
  return a / b;
}

type BpeTable = (string | number[])[];

function buildPieceFactory(bpe: BpeTable) {
  const textEncoder = new TextEncoder();
  const strictDecoder = new TextDecoder("utf-8", { fatal: true });

  return function pieceOf(id: number, index: number): TokenPiece {
    const entry = bpe[id];
    if (typeof entry === "string") {
      return { id, index, text: entry, bytes: [...textEncoder.encode(entry)] };
    }
    if (Array.isArray(entry)) {
      let text: string | null = null;
      try {
        text = strictDecoder.decode(new Uint8Array(entry));
      } catch {
        text = null; // 바이트 조각 — 단독으로는 글자가 되지 않는다
      }
      return { id, index, text, bytes: [...entry] };
    }
    // 특수 토큰 등 테이블 밖 id — 기본 encode()에서는 나오지 않는다
    return { id, index, text: null, bytes: [] };
  };
}

const loaderCache: Partial<Record<EncodingId, Promise<Tokenizer>>> = {};

/**
 * 인코딩별 토크나이저 지연 로딩 (동적 import → 인코딩 사전이 별도 청크가 된다).
 * 동일 인코딩 재요청은 캐시된 Promise를 반환한다.
 */
export function loadTokenizer(encodingId: EncodingId): Promise<Tokenizer> {
  loaderCache[encodingId] ??= buildTokenizer(encodingId);
  return loaderCache[encodingId]!;
}

async function buildTokenizer(encodingId: EncodingId): Promise<Tokenizer> {
  const [mod, ranks] =
    encodingId === "o200k_base"
      ? await Promise.all([
          import("gpt-tokenizer/encoding/o200k_base"),
          import("gpt-tokenizer/bpeRanks/o200k_base"),
        ])
      : await Promise.all([
          import("gpt-tokenizer/encoding/cl100k_base"),
          import("gpt-tokenizer/bpeRanks/cl100k_base"),
        ]);

  const pieceOf = buildPieceFactory(ranks.default as BpeTable);
  const { encode, vocabularySize } = mod;

  return {
    encodingId,
    vocabularySize,
    tokenize(text: string): TokenizeResult {
      const ids = encode(text);
      const pieces = ids.map((id, index) => pieceOf(id, index));
      const charCount = [...text].length;
      return {
        ids,
        pieces,
        tokenCount: ids.length,
        charCount,
        tokensPerChar: charCount === 0 ? 0 : ids.length / charCount,
      };
    },
  };
}
