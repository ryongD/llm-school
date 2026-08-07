/**
 * w-attention 로직 — UI와 분리된 순수 계층 (KICKOFF §3.2, SPEC-2-1).
 * L2: 사전계산 어텐션 트레이스(data/traces/attention)를 재생만 한다.
 *
 * 데이터(262KB)는 §3.5 코드 청크 예산(80KB) 밖으로 빼기 위해 정적
 * 임포트하지 않는다 — 로딩은 data.ts(지연 로딩, 토크나이저 사전과 동일
 * 패턴), 여기는 타입과 순수 함수만 둔다.
 *
 * 인과(causal) 사실: 각 토큰은 자신과 앞 토큰만 본다 — 행(질의)별 대상
 * 인덱스는 항상 질의 인덱스 이하다. 저장 형식은 질의당 상위 3개
 * [대상 인덱스, 가중치×100] 쌍이며, 각 층의 마지막 헤드 인덱스는
 * 헤드 평균(첫 토큰 쏠림 관찰용)이다.
 */

/** [대상 토큰 인덱스, 가중치(0~100 정수)] */
export type AttentionPair = [number, number];

export interface AttentionMeta {
  model: string;
  revision: string;
  script: string;
  generatedAt: string;
  direction: string;
  layersStored: number[];
  layersTotal: number;
  headsTotal: number;
  headsStored: string;
  topK: number;
  weightScale: string;
}

export interface AttentionSentence {
  text: string;
  tokens: string[];
  /** layers["2"][head][query] = 상위 어텐션 쌍들. head === headsTotal 은 평균 */
  layers: Record<string, AttentionPair[][][]>;
}

export interface AttentionTrace {
  _meta: AttentionMeta;
  sentences: AttentionSentence[];
}

/** 헤드 평균이 저장된 인덱스 — polyglot 16헤드 뒤 마지막 자리.
 *  모델 교체 시 _meta.headsTotal과 함께 바뀐다(골든이 일치를 잠근다) */
export const HEAD_MEAN = 16;

/**
 * 추천 보기 — SPEC-2-1 실측의 스타 조합. 훅 문장에서 '타고'(4)가
 * 첫 '배'(2)를 0.94로 쳐다보는 L2·H15. 기본 진입 뷰로 쓴다.
 */
export const CURATED_VIEW = { sentence: 0, layer: 2, head: 15, query: 4 };

export function weightsFor(
  sentence: AttentionSentence,
  layer: number,
  head: number,
  query: number,
): AttentionPair[] {
  return sentence.layers[String(layer)]?.[head]?.[query] ?? [];
}

export function headLabel(head: number): string {
  return head === HEAD_MEAN ? "평균" : `헤드 ${head}`;
}

// ---- 헤드 비교(그리드) 모드 — SPEC-2-2 ----

/**
 * 헤드가 낸 답의 성격. 'prevFirst'는 질의가 1번 토큰이라 '바로 앞'과
 * '첫 토큰'이 같은 자리인 경우 — 싱크 헤드를 인접성 헤드로 오독하지
 * 않도록 중의로 표시한다(SPEC-2-2 측정 함정).
 */
export type LinkKind = "prev" | "first" | "self" | "content" | "prevFirst";

export function classifyLink(query: number, target: number): LinkKind {
  if (query === 1 && target === 0) return "prevFirst";
  if (target === query) return "self";
  if (target === query - 1) return "prev";
  if (target === 0) return "first";
  return "content";
}

export function linkLabel(kind: LinkKind): string {
  switch (kind) {
    case "prev":
      return "바로 앞";
    case "first":
      return "첫 토큰";
    case "self":
      return "자기 자신";
    case "prevFirst":
      return "앞·첫";
    default:
      return "내용 연결";
  }
}

export interface HeadAnswer {
  head: number;
  target: number;
  weight: number;
  kind: LinkKind;
}

/** 한 질의에 대한 헤드별 top-1 답 (평균 헤드 제외 — 그리드는 따로 표시) */
export function headAnswers(
  sentence: AttentionSentence,
  layer: number,
  query: number,
  headCount: number,
): HeadAnswer[] {
  const answers: HeadAnswer[] = [];
  for (let head = 0; head < headCount; head++) {
    const pairs = weightsFor(sentence, layer, head, query);
    if (pairs.length === 0) continue;
    const [target, weight] = pairs[0];
    answers.push({ head, target, weight, kind: classifyLink(query, target) });
  }
  return answers;
}

/** 헤드들이 서로 다른 곳을 보는 정도 — 대상 인덱스 기준 종수 */
export function distinctTargetCount(answers: HeadAnswer[]): number {
  return new Set(answers.map((a) => a.target)).size;
}

/** 한글 받침 유무에 따른 주격 조사 — 요약문 자연스러움용 */
function ga(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "이(가)";
  return (last - 0xac00) % 28 > 0 ? "이" : "가";
}

/** 요약 문장 — 시각화 요약 텍스트(DESIGN §8)용 */
export function summarize(
  sentence: AttentionSentence,
  layer: number,
  head: number,
  query: number,
): string {
  const pairs = weightsFor(sentence, layer, head, query);
  if (pairs.length === 0) return "";
  const q = sentence.tokens[query].trim();
  const targets = pairs
    .map(([to, w]) => `"${sentence.tokens[to].trim()}" ${w}%`)
    .join(", ");
  return `${layer}층 ${headLabel(head)}에서 "${q}"${ga(q)} 쳐다보는 상위: ${targets}`;
}
