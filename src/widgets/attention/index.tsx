"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { loadTrace } from "./data";
import {
  AttentionTrace,
  CURATED_VIEW,
  headLabel,
  summarize,
  weightsFor,
} from "./logic";

/**
 * w-attention UI (SPEC-2-1, DESIGN §5).
 * - 문장 선택 → 토큰 탭(질의) → 그 토큰이 앞 토큰들을 쳐다보는 세기를
 *   아크(선 굵기·농도)와 대상 칩 강조로 표시
 * - 층·헤드 셀렉터(+헤드 평균 — 첫 토큰 쏠림을 숨기지 않는다)
 * - 기본 진입은 추천 보기(L2·H15의 '타고'→'배') — 노이즈 첫인상 방지
 * - 키보드 경로: 토큰이 전부 버튼, 셀렉터는 네이티브 select (§8)
 */

interface ArcSpec {
  x1: number;
  x2: number;
  weight: number; // 0~100
}

export default function AttentionWidget() {
  const [trace, setTrace] = useState<AttentionTrace | null>(null);
  const [sentenceIdx, setSentenceIdx] = useState(CURATED_VIEW.sentence);
  const [layer, setLayer] = useState(CURATED_VIEW.layer);
  const [head, setHead] = useState(CURATED_VIEW.head);
  const [query, setQuery] = useState<number | null>(CURATED_VIEW.query);
  const [arcs, setArcs] = useState<ArcSpec[]>([]);
  const [stripWidth, setStripWidth] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const tokenRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 트레이스 지연 로딩 (262KB — 별도 청크, §3.5)
  useEffect(() => {
    let alive = true;
    loadTrace().then((t) => {
      if (alive) setTrace(t);
    });
    return () => {
      alive = false;
    };
  }, []);

  const sentence = trace?.sentences[sentenceIdx];
  const pairs = useMemo(
    () =>
      query === null || !sentence
        ? []
        : weightsFor(sentence, layer, head, query),
    [sentence, layer, head, query],
  );
  const targetWeight = useMemo(() => {
    const map = new Map<number, number>();
    for (const [to, w] of pairs) map.set(to, w);
    return map;
  }, [pairs]);

  function selectSentence(idx: number) {
    setSentenceIdx(idx);
    setQuery(null);
  }

  function applyCurated() {
    setSentenceIdx(CURATED_VIEW.sentence);
    setLayer(CURATED_VIEW.layer);
    setHead(CURATED_VIEW.head);
    setQuery(CURATED_VIEW.query);
  }

  // 아크 좌표 — 토큰 칩 중심을 측정해 SVG 곡선으로 (스크롤 컨테이너 내부 기준)
  const measure = useCallback(() => {
    const strip = stripRef.current;
    if (!strip || query === null) {
      setArcs([]);
      setStripWidth(stripRef.current?.scrollWidth ?? 0);
      return;
    }
    const stripRect = strip.getBoundingClientRect();
    const centerOf = (i: number) => {
      const el = tokenRefs.current[i];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.left - stripRect.left + strip.scrollLeft + r.width / 2;
    };
    const qx = centerOf(query);
    if (qx === null) return;
    const next: ArcSpec[] = [];
    for (const [to, w] of pairs) {
      if (to === query) continue; // 자기 자신은 칩 강조로만
      const tx = centerOf(to);
      if (tx !== null) next.push({ x1: qx, x2: tx, weight: w });
    }
    setArcs(next);
    setStripWidth(strip.scrollWidth);
  }, [query, pairs]);

  useEffect(() => {
    measure();
    const strip = stripRef.current;
    if (!strip) return;
    const ro = new ResizeObserver(measure);
    ro.observe(strip);
    return () => ro.disconnect();
  }, [measure]);

  if (!trace || !sentence) {
    return (
      <div
        className="flex items-center justify-center p-5 text-caption text-ink-400"
        style={{ minHeight: 520 }}
      >
        실측 데이터를 불러오는 중입니다…
      </div>
    );
  }

  const summary = query === null ? "" : summarize(sentence, layer, head, query);

  return (
    <div className="flex flex-col gap-3 p-5" style={{ minHeight: 520 }}>
      {/* 컨트롤 — 문장·층·헤드 + 추천 보기 */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-caption text-ink-600">
          문장
          <select
            value={sentenceIdx}
            onChange={(e) => selectSentence(Number(e.target.value))}
            className="min-w-0 flex-1 rounded-ctl border border-hairline-strong bg-inset px-2 py-1.5 text-sm-token text-ink-900"
          >
            {trace.sentences.map((s, i) => (
              <option key={i} value={i}>
                {s.text}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-caption text-ink-600">
          층
          <select
            value={layer}
            onChange={(e) => setLayer(Number(e.target.value))}
            aria-label={`층 선택 (전체 ${trace._meta.layersTotal}층 중 ${trace._meta.layersStored.length}층 수록)`}
            className="rounded-ctl border border-hairline-strong bg-inset px-2 py-1.5 text-sm-token text-ink-900"
          >
            {trace._meta.layersStored.map((l) => (
              <option key={l} value={l}>
                {l}층
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-caption text-ink-600">
          헤드
          <select
            value={head}
            onChange={(e) => setHead(Number(e.target.value))}
            className="rounded-ctl border border-hairline-strong bg-inset px-2 py-1.5 text-sm-token text-ink-900"
          >
            {Array.from({ length: trace._meta.headsTotal + 1 }, (_, h) => (
              <option key={h} value={h}>
                {headLabel(h)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={applyCurated}
          className="rounded-ctl border border-jjok-400 bg-jjok-100 px-2.5 py-1.5 text-caption font-medium text-jjok-700 hover:bg-jjok-100"
        >
          추천 보기
        </button>
      </div>

      {/* 토큰 스트립 + 아크 — 한 줄 유지, 좁으면 가로 스크롤 */}
      <div
        ref={stripRef}
        className="relative overflow-x-auto rounded-ctl bg-inset px-3 pt-20 pb-3"
      >
        <svg
          aria-hidden="true"
          width={Math.max(stripWidth, 1)}
          height="72"
          className="pointer-events-none absolute top-2 left-0"
        >
          {arcs.map((a, i) => {
            const midX = (a.x1 + a.x2) / 2;
            const lift = Math.min(64, 14 + Math.abs(a.x1 - a.x2) / 6);
            return (
              <path
                key={i}
                d={`M ${a.x1} 70 Q ${midX} ${70 - lift} ${a.x2} 70`}
                fill="none"
                stroke="var(--jjok-600)"
                strokeWidth={1 + (a.weight / 100) * 4}
                strokeLinecap="round"
                opacity={0.3 + (a.weight / 100) * 0.6}
              />
            );
          })}
        </svg>
        <div className="flex w-max items-end gap-1">
          {sentence.tokens.map((token, i) => {
            const isQuery = i === query;
            const w = targetWeight.get(i);
            const isTarget = w !== undefined && !isQuery;
            return (
              <span key={i} className="flex flex-col items-center gap-0.5">
                <button
                  type="button"
                  ref={(el) => {
                    tokenRefs.current[i] = el;
                  }}
                  onClick={() => setQuery(isQuery ? null : i)}
                  aria-pressed={isQuery}
                  aria-label={`토큰 "${token.trim() || token}" ${isQuery ? "(질의 해제)" : "질의로 선택"}`}
                  className={`rounded-ctl border px-2 py-1 font-mono text-sm-token whitespace-pre transition-colors duration-(--dur-micro) ${
                    isQuery
                      ? "border-jjok-600 bg-jjok-600 font-semibold text-sheet"
                      : isTarget
                        ? "border-jjok-400 text-ink-900"
                        : "border-transparent text-ink-900 hover:border-hairline-strong"
                  }`}
                  style={
                    isTarget
                      ? {
                          backgroundColor: `color-mix(in srgb, var(--jjok-500) ${Math.min(
                            60,
                            8 + w * 0.55,
                          )}%, transparent)`,
                        }
                      : undefined
                  }
                >
                  {token}
                </button>
                <span
                  className="h-4 text-caption text-ink-600 tabular"
                  aria-hidden="true"
                >
                  {isTarget ? `${w}` : isQuery && targetWeight.has(i) ? `${targetWeight.get(i)}` : ""}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* 시각화 요약 (DESIGN §8) */}
      {query !== null ? (
        <p className="text-caption text-ink-600" role="status">
          {summary}
        </p>
      ) : (
        <p className="text-caption text-ink-400" role="status">
          토큰을 탭해 보세요 — 그 토큰이 앞 토큰들을 쳐다보는 세기가 선으로
          그려집니다.
        </p>
      )}

      {/* 정직 캡션 + 생성 메타 (§8.2·§3.3, SPEC-2-1) */}
      <div className="mt-auto flex flex-col gap-1 border-t border-hairline pt-2">
        <p className="text-caption text-ink-400">
          각 토큰은 자신과 앞 토큰만 봅니다(인과 모델 — 가중치 행의 합은 1).
          {" "}{trace._meta.layersTotal}층 중 {trace._meta.layersStored.length}층,
          질의당 상위 {trace._meta.topK}개만 수록했습니다. "평균" 헤드에서
          보이는 첫 토큰 쏠림도 실제 현상 그대로입니다.
        </p>
        <p className="text-caption text-ink-400">
          {trace._meta.model}@{trace._meta.revision.slice(0, 7)} ·{" "}
          {trace._meta.script.split("/").pop()} · {trace._meta.generatedAt} 생성.
        </p>
      </div>
    </div>
  );
}
