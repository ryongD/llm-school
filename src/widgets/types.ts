/** 위젯 공통 타입 (KICKOFF §3.2·§3.3, DESIGN §5) */

/** 데이터 계층 (KICKOFF §3.3) — 모든 챕터는 L1/L2만으로 완결되어야 한다 */
export type WidgetTier = "L1" | "L2" | "L3";

export interface WidgetMeta {
  id: string;
  title: string;
  description: string;
  tier: WidgetTier;
  /** 의존 데이터 파일 경로 (L2 트레이스·facts 등). L1 순수 계산이면 [] */
  dataDeps: string[];
  /** 위젯 청크 예산, gzip KB (KICKOFF §3.5 — 개별 80KB 이하) */
  sizeBudgetKB: number;
  /** 스켈레톤 높이 고정용 (DESIGN §5.4 — CLS 방지) */
  heightPx: number;
  /**
   * 하단 캡션 바 문구 (DESIGN §5.1).
   * L2는 데이터 생성 메타 필수. L1은 생략 시 기본 문구
   * ("이 계산은 브라우저에서 실시간으로 수행됩니다")를 쓴다.
   */
  dataCaption?: string;
  /** 도구 페이지(/tools/[id]) 단독 노출 여부 (KICKOFF §3.2·§7.4) */
  toolPage?: boolean;
  /** "원리가 궁금하다면 → 챕터" 링크 대상 (§6.4) */
  chapterId?: string;
}

/** 위젯 컴포넌트 공통 프롭 — Phase 0에는 없음. 이후 확장 지점 */
export type WidgetProps = Record<string, never>;
