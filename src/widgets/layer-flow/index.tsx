"use client";

import { useMemo, useState } from "react";

import {
  axisMax,
  axisMin,
  finalLayer,
  Metric,
  METRICS,
  seriesFor,
  summarize,
  trace,
} from "./logic";

/**
 * w-layer-flow UI (SPEC-2-3, DESIGN §5).
 * - 문장·토큰을 고르면 그 토큰의 표현이 층을 지나며 어떻게 변하는지 꺾은선
 * - 지표 3종 전환(직전 층 대비 / 입력 대비 / 벡터 길이)
 * - 잔차연결 모식도 토글 — 실측이 아니라 개념 그림임을 라벨로 명시
 * - 정직성: 0층과 마지막 층이 성질이 다르다는 것을 그래프와 캡션에 표시
 */

const CHART_W = 560;
const CHART_H = 200;
const PAD_L = 34;
const PAD_R = 10;
const PAD_T = 12;
const PAD_B = 22;

export default function LayerFlowWidget() {
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [tokenIdx, setTokenIdx] = useState(2);
  const [metric, setMetric] = useState<Metric>("drift");
  const [showResidual, setShowResidual] = useState(false);

  const sentence = trace.sentences[sentenceIdx];
  const last = finalLayer(sentence);
  const series = useMemo(
    () => seriesFor(sentence, metric, tokenIdx),
    [sentence, metric, tokenIdx],
  );
  const yMax = useMemo(() => axisMax(metric, series), [metric, series]);
  const yMin = useMemo(() => axisMin(metric, series), [metric, series]);

  const x = (layer: number) =>
    PAD_L + (layer / last) * (CHART_W - PAD_L - PAD_R);
  const y = (value: number) =>
    PAD_T +
    (1 - (value - yMin) / (yMax - yMin)) * (CHART_H - PAD_T - PAD_B);

  const path = series
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");

  const metricInfo = METRICS.find((m) => m.key === metric)!;

  function selectSentence(idx: number) {
    setSentenceIdx(idx);
    setTokenIdx(Math.min(tokenIdx, trace.sentences[idx].tokens.length - 1));
  }

  return (
    <div className="flex flex-col gap-3 p-5" style={{ minHeight: 580 }}>
      {/* 컨트롤 */}
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
        <div className="flex overflow-hidden rounded-ctl border border-hairline-strong">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              aria-pressed={metric === m.key}
              className={`px-2.5 py-1.5 text-caption font-medium transition-colors duration-(--dur-micro) ${
                metric === m.key
                  ? "bg-jjok-100 text-jjok-700"
                  : "text-ink-600 hover:bg-inset"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 토큰 선택 */}
      <div className="overflow-x-auto rounded-ctl bg-inset px-3 py-2">
        <div className="flex w-max items-center gap-1">
          {sentence.tokens.map((token, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setTokenIdx(i)}
              aria-pressed={i === tokenIdx}
              aria-label={`토큰 "${token.trim() || token}" 선택`}
              className={`rounded-ctl border px-2 py-1 font-mono text-sm-token whitespace-pre transition-colors duration-(--dur-micro) ${
                i === tokenIdx
                  ? "border-jjok-600 bg-jjok-600 font-semibold text-sheet"
                  : "border-transparent text-ink-900 hover:border-hairline-strong"
              }`}
            >
              {token}
            </button>
          ))}
        </div>
      </div>

      {/* 꺾은선 */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          width="100%"
          height={CHART_H}
          role="img"
          aria-label={summarize(sentence, metric, tokenIdx)}
          className="min-w-[420px]"
        >
          {/* 가로 눈금 */}
          {[0, 0.5, 1].map((t) => {
            const value = yMin + (yMax - yMin) * t;
            return (
              <g key={t}>
                <line
                  x1={PAD_L}
                  x2={CHART_W - PAD_R}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="var(--hairline)"
                  strokeWidth="1"
                />
                <text
                  x={PAD_L - 6}
                  y={y(value) + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--ink-400)"
                >
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {/* 양 끝 층 표시 — 성질이 다른 구간(SPEC-2-3) */}
          {[1, last].map((layer) => (
            <line
              key={layer}
              x1={x(layer)}
              x2={x(layer)}
              y1={PAD_T}
              y2={CHART_H - PAD_B}
              stroke="var(--ink-400)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
          ))}

          <path d={path} fill="none" stroke="var(--jjok-600)" strokeWidth="2" />

          {series.map((v, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(v)}
              r={i === 1 || i === last ? 3 : 2}
              fill="var(--jjok-600)"
            />
          ))}

          {/* x축 라벨 */}
          {[0, 1, 6, 12, 18, last].map((layer) => (
            <text
              key={layer}
              x={x(layer)}
              y={CHART_H - 6}
              textAnchor="middle"
              fontSize="10"
              fill="var(--ink-400)"
            >
              {layer}
            </text>
          ))}
          <text x={PAD_L} y={CHART_H - 6} fontSize="10" fill="var(--ink-400)">
            {""}
          </text>
        </svg>
      </div>

      <p className="text-caption text-ink-600" role="status">
        {summarize(sentence, metric, tokenIdx)}
      </p>
      <p className="text-caption text-ink-400">
        {metricInfo.help} 가로축은 층 번호입니다. 점선으로 표시한 1층과{" "}
        {last}층은 나머지 층과 성질이 다릅니다. 0층은 아직 층을 하나도 지나지
        않은 입력 좌표이고, {last}층은 마지막 정규화를 거친 출력입니다.
      </p>

      {/* 잔차연결 모식도 — 실측 아님 */}
      <div>
        <button
          type="button"
          onClick={() => setShowResidual((v) => !v)}
          aria-expanded={showResidual}
          className="rounded-ctl border border-hairline-strong px-2.5 py-1.5 text-caption font-medium text-ink-600 hover:bg-inset"
        >
          지름길이 있는 그림과 없는 그림 {showResidual ? "닫기" : "보기"}
        </button>

        {showResidual ? (
          <div className="mt-2 rounded-ctl border border-hairline bg-inset p-3">
            <p className="mb-2 text-caption font-semibold text-ink-600">
              모식도 (실측이 아니라 개념 그림입니다)
            </p>
            <svg viewBox="0 0 520 120" width="100%" height="120" role="img"
              aria-label="지름길이 없으면 층의 출력이 입력을 대체하고, 지름길이 있으면 층의 출력이 입력에 더해진다는 개념 그림">
              {[
                { y: 30, label: "지름길 없음", detail: "층의 결과가 이전 것을 대체" },
                { y: 90, label: "지름길 있음", detail: "층의 결과가 이전 것에 더해짐" },
              ].map((row, idx) => (
                <g key={row.label}>
                  <text x="0" y={row.y - 12} fontSize="11" fill="var(--ink-600)">
                    {row.label} — {row.detail}
                  </text>
                  <rect x="0" y={row.y} width="54" height="22" rx="4"
                    fill="none" stroke="var(--hairline-strong)" />
                  <text x="27" y={row.y + 15} textAnchor="middle" fontSize="11"
                    fill="var(--ink-900)">이전</text>
                  <line x1="54" x2="120" y1={row.y + 11} y2={row.y + 11}
                    stroke="var(--ink-400)" strokeWidth="1.5" />
                  <rect x="120" y={row.y} width="70" height="22" rx="4"
                    fill="none" stroke="var(--hairline-strong)" />
                  <text x="155" y={row.y + 15} textAnchor="middle" fontSize="11"
                    fill="var(--ink-900)">층 계산</text>
                  <line x1="190" x2="250" y1={row.y + 11} y2={row.y + 11}
                    stroke="var(--ink-400)" strokeWidth="1.5" />
                  {idx === 1 ? (
                    <>
                      {/* 우회로: 이전 값이 층을 건너뛰어 합류 */}
                      <path d={`M 27 ${row.y} Q 27 ${row.y - 22} 140 ${row.y - 22} Q 250 ${row.y - 22} 250 ${row.y + 4}`}
                        fill="none" stroke="var(--jjok-600)" strokeWidth="1.5" />
                      <circle cx="250" cy={row.y + 11} r="9" fill="none"
                        stroke="var(--jjok-600)" strokeWidth="1.5" />
                      <text x="250" y={row.y + 15} textAnchor="middle" fontSize="11"
                        fill="var(--jjok-700)">+</text>
                      <line x1="259" x2="300" y1={row.y + 11} y2={row.y + 11}
                        stroke="var(--ink-400)" strokeWidth="1.5" />
                      <rect x="300" y={row.y} width="70" height="22" rx="4"
                        fill="none" stroke="var(--jjok-400)" />
                      <text x="335" y={row.y + 15} textAnchor="middle" fontSize="11"
                        fill="var(--ink-900)">다음 층</text>
                    </>
                  ) : (
                    <>
                      <rect x="250" y={row.y} width="70" height="22" rx="4"
                        fill="none" stroke="var(--hairline-strong)" />
                      <text x="285" y={row.y + 15} textAnchor="middle" fontSize="11"
                        fill="var(--ink-900)">다음 층</text>
                    </>
                  )}
                </g>
              ))}
            </svg>
            <p className="mt-1 text-caption text-ink-400">
              트랜스포머는 아래쪽입니다. 층이 계산한 결과를 이전 값에 더하기
              때문에, 한 층이 아무리 많이 계산해도 이전 값이 통째로 밀려나지
              않습니다.
            </p>
          </div>
        ) : null}
      </div>

      {/* 정직 캡션 + 생성 메타 (§3.3) */}
      <div className="mt-auto flex flex-col gap-1 border-t border-hairline pt-2">
        <p className="text-caption text-ink-400">
          {trace._meta.model}@{trace._meta.revision.slice(0, 7)} ·{" "}
          {trace._meta.script.split("/").pop()} · {trace._meta.generatedAt} 생성.
        </p>
      </div>
    </div>
  );
}
