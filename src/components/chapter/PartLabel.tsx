import type { Chapter } from "#velite";
import { PART_NAMES, partColorVar } from "@/lib/curriculum";
import { visibleChapters } from "@/lib/content";

/**
 * 챕터 상단 진행 UI (DESIGN §4.8) —
 * 파트 라벨(해당 파트 쪽빛 농도) + 파트 내 위치 점(●●○○○).
 */
export function PartLabel({ chapter }: { chapter: Chapter }) {
  const partChapters = visibleChapters().filter(
    (c) => c.part === chapter.part,
  );
  const position = partChapters.findIndex((c) => c.id === chapter.id);
  const color = partColorVar(chapter.part);

  return (
    <div
      className="flex items-center gap-3 text-sm-token font-medium"
      style={{ color }}
    >
      <span>
        파트 {chapter.part} · {PART_NAMES[chapter.part]}
      </span>
      <span
        aria-label={`파트 내 ${position + 1}번째 / 총 ${partChapters.length}챕터`}
        className="tracking-widest"
      >
        {partChapters.map((c, i) => (i <= position ? "●" : "○")).join("")}
      </span>
    </div>
  );
}
