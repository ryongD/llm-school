"use client";

import { useEffect, useMemo, useState } from "react";

import {
  clampInput,
  ENCODINGS,
  formatBytes,
  loadTokenizer,
  MAX_INPUT_CHARS,
  tokenRatio,
  type EncodingId,
  type TokenizeResult,
  type Tokenizer,
} from "./logic";

/**
 * w-tokenizer UI (KICKOFF §8.2.1, DESIGN §5.5).
 * - 토큰 블록: --tk-* 6색 순환, 탭 시 상세(ID·바이트)는 블록 하단 확장(팝오버 금지)
 * - 바이트 조각(한글이 글자 중간에서 쪼개진 토큰)은 점선 테두리 + 바이트 표기 —
 *   숨기지 않는다. 이게 1-1의 교육 포인트다.
 * - 모든 조작 터치 가능, 시각화 요약 텍스트 상시 표시(DESIGN §8)
 */

const PRESETS = ["안녕하세요", "hello", "딸기"] as const;

const COMPARE_DEFAULT_KO = "같은 뜻이라도 한국어가 토큰을 더 씁니다.";
const COMPARE_DEFAULT_EN = "Korean costs more tokens for the same meaning.";

type Mode = "single" | "compare";

function tkVar(index: number, part: "bg" | "fg"): string {
  return `var(--tk-${(index % 6) + 1}-${part})`;
}

/** 공백·개행을 눈에 보이게 (블록 안 텍스트용) */
function displayText(text: string): string {
  return text.replaceAll("\n", "⏎");
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

function TokenBlocks({
  result,
  selected,
  onSelect,
}: {
  result: TokenizeResult;
  selected: number | null;
  onSelect: (index: number | null) => void;
}) {
  if (result.tokenCount === 0) {
    return (
      <p className="py-6 text-center text-sm-token text-ink-400">
        문장을 입력하면 토큰 조각이 여기 나타납니다
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1 py-3" role="list" aria-label="토큰 블록">
      {result.pieces.map((piece) => {
        const isByte = piece.text === null;
        const isSelected = selected === piece.index;
        return (
          <button
            key={piece.index}
            type="button"
            role="listitem"
            onClick={() => onSelect(isSelected ? null : piece.index)}
            aria-label={
              isByte
                ? `토큰 ${piece.index + 1}: 바이트 조각 ${formatBytes(piece.bytes)}`
                : `토큰 ${piece.index + 1}: ${piece.text}`
            }
            className={`rounded-ctl px-1.5 py-0.5 font-mono text-sm-token whitespace-pre ${
              isByte ? "border border-dashed" : ""
            } ${isSelected ? "outline-2 outline-offset-1 outline-jjok-500" : ""}`}
            style={{
              backgroundColor: tkVar(piece.index, "bg"),
              color: tkVar(piece.index, "fg"),
              borderColor: isByte ? tkVar(piece.index, "fg") : undefined,
            }}
          >
            {isByte ? formatBytes(piece.bytes) : displayText(piece.text ?? "")}
          </button>
        );
      })}
    </div>
  );
}

function SelectedDetail({
  result,
  selected,
}: {
  result: TokenizeResult;
  selected: number | null;
}) {
  if (selected === null || !result.pieces[selected]) return null;
  const piece = result.pieces[selected];
  return (
    <div className="rounded-ctl bg-inset px-3 py-2 text-caption text-ink-600">
      <span className="font-semibold text-ink-900">
        토큰 {piece.index + 1} / {result.tokenCount}
      </span>
      {" · ID "}
      <span className="font-mono tabular">{piece.id}</span>
      {" · 바이트 "}
      <span className="font-mono">{formatBytes(piece.bytes)}</span>
      {" · "}
      {piece.text === null
        ? "바이트 조각 — 단독으로는 글자가 되지 않습니다 (글자의 일부)"
        : `조각: "${displayText(piece.text)}"`}
    </div>
  );
}

function CountSummary({
  result,
  label,
}: {
  result: TokenizeResult;
  label?: string;
}) {
  return (
    <p className="text-caption text-ink-600 tabular" role="status">
      {label ? `${label}: ` : "현재 입력: "}
      토큰 <span className="font-semibold">{result.tokenCount}</span>개 · 글자{" "}
      {result.charCount}개 · 글자당 토큰{" "}
      {result.charCount === 0 ? "—" : result.tokensPerChar.toFixed(2)}
    </p>
  );
}

export default function TokenizerWidget() {
  const [encoding, setEncoding] = useState<EncodingId>("o200k_base");
  const [mode, setMode] = useState<Mode>("single");
  const [tokenizer, setTokenizer] = useState<Tokenizer | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [text, setText] = useState<string>(PRESETS[0]);
  const [textKo, setTextKo] = useState(COMPARE_DEFAULT_KO);
  const [textEn, setTextEn] = useState(COMPARE_DEFAULT_EN);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTokenizer(null);
    setLoadError(false);
    loadTokenizer(encoding)
      .then((t) => {
        if (!cancelled) setTokenizer(t);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [encoding, retryKey]);

  const single = useMemo(() => {
    if (!tokenizer) return null;
    const { text: clamped, truncated } = clampInput(text);
    return { result: tokenizer.tokenize(clamped), truncated };
  }, [tokenizer, text]);

  const compare = useMemo(() => {
    if (!tokenizer) return null;
    const ko = tokenizer.tokenize(clampInput(textKo).text);
    const en = tokenizer.tokenize(clampInput(textEn).text);
    return { ko, en, ratio: tokenRatio(ko.tokenCount, en.tokenCount) };
  }, [tokenizer, textKo, textEn]);

  const encodingMeta = ENCODINGS.find((e) => e.id === encoding);

  return (
    <div className="flex flex-col gap-3 p-5" style={{ minHeight: 520 }}>
      {/* 컨트롤 행 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label="모드 선택">
          <SegButton active={mode === "single"} onClick={() => setMode("single")}>
            한 문장
          </SegButton>
          <SegButton
            active={mode === "compare"}
            onClick={() => setMode("compare")}
          >
            비교 (한 ↔ 영)
          </SegButton>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="인코딩 선택">
          {ENCODINGS.map((e) => (
            <SegButton
              key={e.id}
              active={encoding === e.id}
              onClick={() => setEncoding(e.id)}
            >
              {e.label}
            </SegButton>
          ))}
        </div>
      </div>
      <p className="text-caption text-ink-400">
        인코딩: {encodingMeta?.label} ({encodingMeta?.note})
      </p>

      {loadError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm-token text-err">
            토크나이저 사전을 불러오지 못했습니다 — 네트워크 상태를 확인해
            주세요.
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="rounded-ctl border border-hairline-strong px-3 py-1.5 text-sm-token text-ink-600 hover:bg-inset"
          >
            다시 시도
          </button>
        </div>
      ) : !tokenizer ? (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-2"
          role="status"
        >
          <span className="size-4 animate-spin rounded-full border-2 border-hairline-strong border-t-jjok-500" />
          <p className="text-caption text-ink-600">
            토크나이저 사전 내려받는 중 —{" "}
            {encoding === "o200k_base" ? "약 1MB" : "약 0.4MB"} (최초 1회)
          </p>
        </div>
      ) : mode === "single" && single ? (
        <>
          <div className="flex flex-wrap gap-1" role="group" aria-label="예문 프리셋">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setText(p);
                  setSelected(null);
                }}
                className="rounded-ctl border border-hairline-strong px-2 py-0.5 text-caption text-ink-600 hover:bg-inset"
              >
                {p}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSelected(null);
            }}
            rows={2}
            aria-label="토큰화할 문장"
            placeholder="아무 문장이나 넣어보세요"
            className="w-full resize-y rounded-ctl bg-inset p-3 text-body text-ink-900 placeholder:text-ink-400"
          />
          {single.truncated ? (
            <p className="text-caption text-warn">
              입력이 길어 앞 {MAX_INPUT_CHARS.toLocaleString("ko-KR")}자까지만
              토큰화했습니다
            </p>
          ) : null}

          <TokenBlocks
            result={single.result}
            selected={selected}
            onSelect={setSelected}
          />
          <SelectedDetail result={single.result} selected={selected} />
          {selected === null && single.result.tokenCount > 0 ? (
            <p className="text-caption text-ink-400">
              블록을 탭하면 토큰 ID와 바이트가 보입니다
            </p>
          ) : null}

          <div className="mt-auto border-t border-hairline pt-2">
            <CountSummary result={single.result} />
          </div>
        </>
      ) : compare ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-caption font-semibold text-ink-600">
                한국어
                <textarea
                  value={textKo}
                  onChange={(e) => setTextKo(e.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-ctl bg-inset p-3 text-body font-normal text-ink-900"
                />
              </label>
              <CountSummary result={compare.ko} label="한국어" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-caption font-semibold text-ink-600">
                영어 (번역)
                <textarea
                  value={textEn}
                  onChange={(e) => setTextEn(e.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-ctl bg-inset p-3 text-body font-normal text-ink-900"
                />
              </label>
              <CountSummary result={compare.en} label="영어" />
            </div>
          </div>

          {/* 토큰 수 비율 막대 (DESIGN §5.5 — 값 라벨 tabular, 최댓값 강조는 굵기) */}
          <div className="mt-2 flex flex-col gap-1.5">
            {(
              [
                ["한국어", compare.ko.tokenCount],
                ["영어", compare.en.tokenCount],
              ] as const
            ).map(([label, count]) => {
              const max = Math.max(compare.ko.tokenCount, compare.en.tokenCount, 1);
              const isMax =
                count === Math.max(compare.ko.tokenCount, compare.en.tokenCount);
              return (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-16 text-caption text-ink-600">{label}</span>
                  <div
                    className="h-4 flex-1 rounded-ctl"
                    style={{ backgroundColor: "var(--bar-track)" }}
                  >
                    <div
                      className="h-full rounded-ctl transition-[width] duration-(--dur-micro)"
                      style={{
                        width: `${(count / max) * 100}%`,
                        backgroundColor: "var(--bar-fill)",
                      }}
                    />
                  </div>
                  <span
                    className={`w-14 text-right text-caption tabular ${isMax ? "font-semibold" : ""}`}
                  >
                    {count}토큰
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-auto border-t border-hairline pt-2">
            <p className="text-sm-token text-ink-900" role="status">
              {compare.ratio === null
                ? "두 문장을 입력하면 비율이 계산됩니다"
                : `같은 뜻을 담는 데 한국어가 영어의 ${compare.ratio.toFixed(2)}배 토큰을 씁니다`}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
