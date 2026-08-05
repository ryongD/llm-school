"use client";

import { useEffect, useState } from "react";

/**
 * 토큰 시트 (DESIGN §9-1) — 전 색 토큰을 실물 스와치로 보여주고
 * fg/bg 쌍의 WCAG 대비를 실측·표기한다(§8 기준: 텍스트 4.5:1, UI 3:1).
 * 값은 getComputedStyle로 읽으므로 다크 모드 전환 시 자동 재계산된다.
 */

interface Pair {
  label: string;
  fgVar: string;
  bgVar: string;
  /** 요구 대비 (텍스트 4.5 / UI 3) */
  required: number;
}

const PAIRS: Pair[] = [
  { label: "본문", fgVar: "--ink-900", bgVar: "--bg-page", required: 4.5 },
  { label: "보조", fgVar: "--ink-600", bgVar: "--bg-page", required: 4.5 },
  { label: "캡션", fgVar: "--ink-400", bgVar: "--bg-page", required: 4.5 },
  // 캡션의 최저 조건 — Depth 힌트 등 인셋 배경 위 사용처가 있다
  { label: "캡션(인셋 위)", fgVar: "--ink-400", bgVar: "--bg-inset", required: 4.5 },
  { label: "링크", fgVar: "--jjok-600", bgVar: "--bg-page", required: 4.5 },
  { label: "칩 S1", fgVar: "--jjok-700", bgVar: "--jjok-100", required: 4.5 },
  { label: "판정 ok", fgVar: "--ok", bgVar: "--bg-page", required: 4.5 },
  { label: "판정 warn", fgVar: "--warn", bgVar: "--bg-page", required: 4.5 },
  { label: "판정 err", fgVar: "--err", bgVar: "--bg-page", required: 4.5 },
  ...[1, 2, 3, 4, 5, 6].map((i) => ({
    label: `토큰 블록 ${i}`,
    fgVar: `--tk-${i}-fg`,
    bgVar: `--tk-${i}-bg`,
    required: 4.5,
  })),
];

function parseColor(value: string): [number, number, number] | null {
  const m = value.match(/rgba?\(([\d.\s,%]+)\)/);
  if (!m) return null;
  const parts = m[1].split(",").map((p) => parseFloat(p));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0], parts[1], parts[2]];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(fg: string, bg: string): number | null {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return null;
  const [l1, l2] = [luminance(f), luminance(b)].sort((a, z) => z - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

interface Row extends Pair {
  ratio: number | null;
}

export function ColorTokenSheet() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    function measure() {
      const probe = document.createElement("div");
      document.body.appendChild(probe);
      const next = PAIRS.map((pair) => {
        probe.style.color = `var(${pair.fgVar})`;
        probe.style.backgroundColor = `var(${pair.bgVar})`;
        const cs = getComputedStyle(probe);
        return {
          ...pair,
          ratio: contrastRatio(cs.color, cs.backgroundColor),
        };
      });
      probe.remove();
      setRows(next);
    }
    measure();
    // 테마 토글(data-theme 변경) 시 재계산
    const observer = new MutationObserver(measure);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row) => {
        const pass = row.ratio !== null && row.ratio >= row.required;
        return (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-ctl border border-hairline px-3 py-2"
            style={{
              color: `var(${row.fgVar})`,
              backgroundColor: `var(${row.bgVar})`,
            }}
          >
            <span className="text-sm-token font-medium">{row.label}</span>
            <span className="text-caption tabular">
              {row.ratio ? `${row.ratio.toFixed(2)}:1` : "측정 불가"}{" "}
              {row.ratio ? (pass ? "· 통과" : "· 미달") : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
