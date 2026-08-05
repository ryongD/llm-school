"use client";

import { useState } from "react";

import { square } from "./logic";

/**
 * 더미 위젯 (Phase 0 전용) — 조작 → 즉시 반응 → 요약 텍스트라는
 * 위젯 공통 계약(§8 접근성: 시각화 요약 텍스트 병행)만 시연한다.
 */
export default function DummyCounterWidget() {
  const [n, setN] = useState(3);
  const result = square(n);

  return (
    <div className="flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm-token text-ink-600">
          n 값 (방향키로도 조절 가능)
        </span>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-full accent-jjok-500"
          aria-valuetext={`n = ${n}`}
        />
      </label>

      <div className="flex items-end gap-3" aria-hidden="true">
        {/* 확률/수치 막대 문법 (DESIGN §5.5) — 값 라벨은 막대 끝 tabular */}
        <div className="h-24 w-10 rounded-ctl bg-inset" role="presentation">
          <div
            className="w-full rounded-ctl bg-jjok-500 transition-[height] duration-(--dur-micro)"
            style={{ height: `${result}%` }}
          />
        </div>
        <p className="font-mono text-h2 tabular">{result}</p>
      </div>

      {/* 시각화 요약 텍스트 — aria + 화면 표시 겸용 (DESIGN §8) */}
      <p className="text-caption text-ink-600" role="status">
        현재 설정: n = {n} → n² = {result}
      </p>
    </div>
  );
}
