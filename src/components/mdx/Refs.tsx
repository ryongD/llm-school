import { getReference } from "@/lib/references";
import type { ReferenceGrade } from "@/lib/references";

/**
 * 참고문헌 섹션 (KICKOFF §5.1, DESIGN §4.4 — 신뢰 UI의 핵심 1).
 * 숨기지 않고 모든 챕터 하단에 노출한다 — 이 섹션의 존재 자체가 차별화.
 * 등급 칩이 출처 위계(S1/S2/S3)를 시각화한다.
 */

const GRADE_LABEL: Record<ReferenceGrade, string> = {
  S1: "S1 논문",
  S2: "S2 공식 문서",
  S3: "S3 2차 자료",
};

function GradeChip({ grade }: { grade: ReferenceGrade }) {
  const styles =
    grade === "S1"
      ? "bg-jjok-100 text-jjok-700"
      : "bg-inset text-ink-600";
  return (
    <span
      className={`mr-2 inline-block rounded-ctl px-1.5 py-0.5 align-middle text-caption font-medium whitespace-nowrap ${styles}`}
    >
      {GRADE_LABEL[grade]}
    </span>
  );
}

export function Refs({ referenceKeys }: { referenceKeys: string[] }) {
  const refs = referenceKeys.map((key) => ({ key, ...getReference(key) }));

  return (
    <section className="mt-12 border-t border-hairline pt-6">
      <h3 className="text-h3 font-bold text-ink-900">참고문헌</h3>
      <ul className="mt-4 space-y-2">
        {refs.map((ref) => (
          <li
            key={ref.key}
            className="-indent-5 pl-5 text-sm-token leading-[1.6] text-ink-900"
          >
            <GradeChip grade={ref.grade} />
            {ref.authors} ({ref.year}). {ref.title}.{" "}
            <a
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-jjok-600 underline decoration-1 underline-offset-2"
            >
              원문 <span aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
