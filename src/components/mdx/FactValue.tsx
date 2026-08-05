import { resolveFact } from "@/lib/facts";
import { FactValueChip } from "./FactValueChip";

/**
 * 시효성 수치 삽입 (KICKOFF §4.4) — 본문에 시효성 숫자 하드코딩 금지.
 * <FactValue id="gpt4o.context" /> 형태로만 참조한다(린트 §4.5-7 휴리스틱과 한 쌍).
 */
export function FactValue({ id, unit }: { id: string; unit?: string }) {
  const fact = resolveFact(id);

  const display =
    typeof fact.value === "number"
      ? fact.value.toLocaleString("ko-KR")
      : String(fact.value);

  const source = fact.note ?? fact.sourceRef ?? fact.file;
  const tooltip = `검증일 ${fact.meta.lastVerified} · ${source}`;

  return (
    <FactValueChip
      display={unit ? `${display}${unit}` : display}
      tooltip={tooltip}
    />
  );
}
