import type { WidgetMeta } from "../types";

/** w-tokenizer — 1-1의 앵커이자 /tools/tokenizer (KICKOFF §8.1·§8.2.1) */
export const meta: WidgetMeta = {
  id: "w-tokenizer",
  title: "토크나이저 — 글을 토큰 조각으로",
  description:
    "문장을 실제 토크나이저(gpt-tokenizer)로 쪼개 토큰 블록으로 보여준다. 한국어와 영어의 토큰 비용 비교, 토큰 ID·바이트 상세, 한글이 바이트 단위로 쪼개지는 현상까지 브라우저에서 실시간으로 확인한다.",
  tier: "L1",
  // 인코딩 사전은 지연 로딩 별도 청크 (gzip 실측: o200k 약 1.02MB, cl100k 약 435KB
  // — gpt-tokenizer@3.4.0). §3.5 예산 처리는 재성 결정 대기.
  dataDeps: [
    "gpt-tokenizer/bpeRanks/o200k_base (지연 로딩)",
    "gpt-tokenizer/bpeRanks/cl100k_base (지연 로딩)",
  ],
  sizeBudgetKB: 80,
  heightPx: 560,
  toolPage: true,
  toolSlug: "tokenizer", // §7.4 — /tools/tokenizer
  chapterId: "1-1",
};
