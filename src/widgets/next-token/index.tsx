"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  actualInTopN,
  DISPLAY_TOP_N,
  displayToken,
  formatPercent,
  probOf,
  trace,
} from "./logic";

/**
 * w-next-token UI (SPEC-1-2, DESIGN §5.5).
 * - 문장 선택 → 토큰 스테퍼(버튼 + 좌우 방향키 §8) → top-5 확률 막대
 * - 실제 다음 토큰: top-5 안이면 해당 행 강조(굵기+라벨 — 색 단독 금지),
 *   밖이면 순위·확률을 별도 행으로 정직하게 노출(소형 모델의 한계 §8.2.2)
 * - 내 예상 모드: 분포를 가리고, 마음속으로 찍은 뒤 공개(채점 없음)
 */

function tkVar(index: number, part: "bg" | "fg"): string {
  return `var(--tk-${(index % 6) + 1}-${part})`;
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-ctl border px-2.5 py-1 text-caption font-medium transition-colors duration-(--dur-micro) ${
        active
          ? "border-jjok-400 bg-jjok-100 text-jjok-700"
          : "border-hairline-strong bg-transparent text-ink-600 hover:bg-inset"
      }`}
    >
      {children}
    </button>
  );
}

export default function NextTokenWidget() {
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [guessMode, setGuessMode] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const stepperRef = useRef<HTMLDivElement>(null);

  const sentence = trace.sentences[sentenceIdx];
  const step = sentence.steps[stepIdx];
  const totalSteps = sentence.steps.length;

  // 예상 모드에서는 새 스텝마다 분포를 가린다
  useEffect(() => {
    setRevealed(!guessMode);
  }, [guessMode, stepIdx, sentenceIdx]);

  function selectSentence(idx: number) {
    setSentenceIdx(idx);
    setStepIdx(0);
  }

  function move(delta: number) {
    setStepIdx((i) => Math.min(totalSteps - 1, Math.max(0, i + delta)));
  }

  // 스테퍼 좌우 방향키 (DESIGN §8)
  function onStepperKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    }
  }

  const topN = step.topk.slice(0, DISPLAY_TOP_N);
  const actualOutside = !actualInTopN(step);

  const summary = useMemo(() => {
    const context = sentence.tokens.slice(0, step.position).join("");
    const top1 = topN[0];
    return `스텝 ${stepIdx + 1}/${totalSteps}: "${context}" 다음 — 모델 1순위 "${displayToken(top1.token)}" ${formatPercent(top1.logprob)}, 실제 "${displayToken(step.actual.token)}" (${step.actual.rank}위)`;
  }, [sentence, step, stepIdx, totalSteps, topN]);

  return (
    <div className="flex flex-col gap-3 p-5" style={{ minHeight: 520 }}>
      {/* 컨트롤 — 문장 선택 + 예상 모드 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <SegButton active={guessMode} onClick={() => setGuessMode((v) => !v)}>
          내 예상 모드 {guessMode ? "켬" : "끔"}
        </SegButton>
      </div>

      {/* 문장 스트립 — 지나온 토큰 + 현재 위치(?) */}
      <div
        className="flex min-h-16 flex-wrap content-start items-start gap-1 rounded-ctl bg-inset p-3"
        aria-label="문장 진행 상태"
      >
        {sentence.tokens.slice(0, step.position).map((t, i) => (
          <span
            key={i}
            className="rounded-ctl px-1.5 py-0.5 font-mono text-sm-token whitespace-pre"
            style={{ backgroundColor: tkVar(i, "bg"), color: tkVar(i, "fg") }}
          >
            {displayToken(t)}
          </span>
        ))}
        <span
          className="rounded-ctl border border-dashed border-jjok-500 px-2.5 py-0.5 font-mono text-sm-token text-jjok-600"
          aria-label="다음 토큰 자리"
        >
          ?
        </span>
        {step.position < sentence.tokens.length - 1 ? (
          <span className="px-1 py-0.5 text-sm-token text-ink-400" aria-hidden="true">
            ⋯
          </span>
        ) : null}
      </div>

      {/* 스테퍼 */}
      <div
        ref={stepperRef}
        role="group"
        aria-label="토큰 스테퍼 — 좌우 방향키로도 이동"
        tabIndex={0}
        onKeyDown={onStepperKeyDown}
        className="flex items-center justify-center gap-3 rounded-ctl focus-visible:outline-2"
      >
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={stepIdx === 0}
          aria-label="이전 스텝"
          className="rounded-ctl border border-hairline-strong px-3 py-1.5 text-sm-token text-ink-600 hover:bg-inset disabled:opacity-40"
        >
          ◀
        </button>
        <span className="text-caption text-ink-600 tabular">
          스텝 {stepIdx + 1} / {totalSteps}
        </span>
        <button
          type="button"
          onClick={() => move(1)}
          disabled={stepIdx === totalSteps - 1}
          aria-label="다음 스텝"
          className="rounded-ctl border border-hairline-strong px-3 py-1.5 text-sm-token text-ink-600 hover:bg-inset disabled:opacity-40"
        >
          ▶
        </button>
      </div>

      {/* 분포 영역 */}
      {!revealed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-ctl border border-dashed border-hairline-strong p-6">
          <p className="text-center text-sm-token text-ink-600">
            다음에 올 조각을 마음속으로 찍어보세요.
            <br />
            정한 뒤에 분포를 열어 비교합니다 — 채점은 없습니다.
          </p>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="rounded-ctl bg-jjok-600 px-4 py-2 text-sm-token font-medium text-sheet hover:bg-jjok-700"
          >
            분포 공개
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5" aria-label="모델의 다음 토큰 확률 top-5">
          {topN.map((t, i) => {
            const isActual = t.id === step.actual.id;
            return (
              <div key={t.id} className="flex items-center gap-2">
                <span className="w-5 text-right text-caption text-ink-400 tabular">
                  {i + 1}
                </span>
                <span className="min-w-16 rounded-ctl bg-inset px-1.5 py-0.5 text-center font-mono text-sm-token whitespace-pre text-ink-900">
                  {displayToken(t.token)}
                </span>
                {/* 절대 확률 스케일 — 쏠린 스텝과 팽팽한 스텝의 막대 길이가
                    실제로 다르게 보여야 조작 가이드 1이 성립한다 (CP2 반영) */}
                <div className="h-4 flex-1 rounded-ctl" style={{ backgroundColor: "var(--bar-track)" }}>
                  <div
                    className="h-full rounded-ctl"
                    style={{
                      width: `${probOf(t.logprob) * 100}%`,
                      backgroundColor: "var(--bar-fill)",
                    }}
                  />
                </div>
                <span
                  className={`w-14 text-right text-caption tabular ${i === 0 ? "font-semibold" : ""}`}
                >
                  {formatPercent(t.logprob)}
                </span>
                <span className="w-9 text-caption font-semibold text-ok">
                  {isActual ? "실제" : ""}
                </span>
              </div>
            );
          })}

          {actualOutside ? (
            <p className="mt-1 rounded-ctl bg-inset px-3 py-2 text-caption text-ink-600">
              실제 다음 조각{" "}
              <span className="font-mono whitespace-pre text-ink-900">
                {displayToken(step.actual.token)}
              </span>
              은 모델 예상 밖이었습니다 — {step.actual.rank}위,{" "}
              {formatPercent(step.actual.logprob)}
            </p>
          ) : null}
        </div>
      )}

      {/* 시각화 요약 텍스트 (DESIGN §8) */}
      {revealed ? (
        <p className="text-caption text-ink-600" role="status">
          {summary}
        </p>
      ) : null}

      {/* 정직 캡션 + 생성 메타 전체 노출 (§8.2.2·§3.3, SPEC-1-2) */}
      <div className="mt-auto flex flex-col gap-1 border-t border-hairline pt-2">
        <p className="text-caption text-ink-400">
          왜 정해진 문장만 있나요? — 실제 모델의 예측을 미리 계산해 담아 두고
          재생하는 방식이라서입니다.
        </p>
        <p className="text-caption text-ink-400">
          소형 모델의 실제 예측입니다 — 어설픈 지점도 그대로 보여줍니다.{" "}
          {trace._meta.model}@{trace._meta.revision} ·{" "}
          {trace._meta.script.split("/").pop()} · seed {trace._meta.seed} ·{" "}
          {trace._meta.generatedAt} 생성.
        </p>
      </div>
    </div>
  );
}
