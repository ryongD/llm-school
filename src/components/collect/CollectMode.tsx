"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  addBacklogItem,
  BacklogItem,
  clearBacklog,
  COLLECT_EVENT,
  exportBacklogJson,
  getBacklog,
  isCollectOn,
  normalizeWord,
  removeBacklogItem,
} from "@/lib/collect";

/**
 * 채집 모드 UI (KICKOFF §4.7) — 재성 전용, 독자 비노출.
 * - 본문 텍스트 선택 → "백로그에 추가" 플로팅 버튼 → 메모와 함께 저장
 * - 좌하단 칩 → 목록·JSON 내보내기·삭제 (키보드 경로: 직접 추가 입력)
 * - 플래그(푸터 버전 표기 7연타)가 꺼져 있으면 아무것도 렌더하지 않는다
 */

interface PendingCapture {
  word: string;
  anchor?: string;
}

/** 선택 영역에서 가장 가까운 이전 헤딩 id (rehype-slug 산출)를 찾는다 */
function nearestAnchor(node: Node | null): string | undefined {
  let el: HTMLElement | null =
    node instanceof HTMLElement ? node : (node?.parentElement ?? null);
  while (el && el.tagName !== "MAIN" && el.tagName !== "BODY") {
    let sib: Element | null = el;
    while (sib) {
      if (/^H[2-4]$/.test(sib.tagName) && sib.id) return sib.id;
      sib = sib.previousElementSibling;
    }
    el = el.parentElement;
  }
  return undefined;
}

export function CollectMode() {
  const [on, setOn] = useState(false);
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [selRect, setSelRect] = useState<{ x: number; y: number } | null>(null);
  const [pending, setPending] = useState<PendingCapture | null>(null);
  const [memo, setMemo] = useState("");
  const [manualWord, setManualWord] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState("");
  const selectionRef = useRef<PendingCapture | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    setOn(isCollectOn());
    setItems(getBacklog());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(COLLECT_EVENT, refresh);
    return () => window.removeEventListener(COLLECT_EVENT, refresh);
  }, [refresh]);

  // 본문(main) 안의 텍스트 선택을 감지해 플로팅 버튼을 띄운다
  useEffect(() => {
    if (!on) return;
    function onSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSelRect(null);
        selectionRef.current = null;
        return;
      }
      const range = sel.getRangeAt(0);
      const main = document.querySelector("main");
      if (!main || !main.contains(range.commonAncestorContainer)) return;
      const text = normalizeWord(sel.toString());
      if (!text) return;
      const rect = range.getBoundingClientRect();
      selectionRef.current = {
        word: text,
        anchor: nearestAnchor(range.startContainer),
      };
      setSelRect({
        x: Math.min(Math.max(rect.left + rect.width / 2, 72), window.innerWidth - 72),
        y: Math.max(rect.top, 48),
      });
    }
    document.addEventListener("pointerup", onSelection);
    document.addEventListener("keyup", onSelection);
    return () => {
      document.removeEventListener("pointerup", onSelection);
      document.removeEventListener("keyup", onSelection);
    };
  }, [on]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  function beginCapture() {
    if (!selectionRef.current) return;
    setPending(selectionRef.current);
    setMemo("");
    setSelRect(null);
  }

  function saveCapture(word: string, anchor?: string) {
    const clean = normalizeWord(word);
    if (!clean) return;
    const next = addBacklogItem({
      word: clean,
      source: {
        path: window.location.pathname,
        ...(anchor ? { anchor } : {}),
        title: document.title.split("·")[0]?.trim(),
      },
      ...(memo.trim() ? { memo: memo.trim() } : {}),
    });
    setItems(next);
    setPending(null);
    setMemo("");
    showToast(`백로그에 담음 — ${next.length}개`);
  }

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportBacklogJson(items));
      showToast("JSON 복사됨 — data/backlog.json에 병합");
    } catch {
      showToast("복사 실패 — 브라우저 권한을 확인하세요");
    }
  }

  if (!on) return null;

  return (
    <div className="text-sm-token">
      {/* 선택 위 플로팅 버튼 */}
      {selRect ? (
        <button
          type="button"
          // pointerdown에서 선택이 풀리기 전에 잡는다
          onPointerDown={(e) => {
            e.preventDefault();
            beginCapture();
          }}
          style={{ left: selRect.x, top: selRect.y }}
          className="fixed z-(--z-hint) -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-ctl border border-hairline-strong bg-sheet px-2.5 py-1 text-caption font-medium text-ink-900 shadow-pop"
        >
          백로그에 추가
        </button>
      ) : null}

      {/* 채집 입력 카드 */}
      {pending ? (
        <div className="fixed right-4 bottom-16 z-(--z-hint) w-72 max-w-[calc(100vw-2rem)] rounded-card border border-hairline bg-sheet p-3 shadow-pop">
          <p className="text-caption text-ink-600">채집</p>
          <p className="mt-1 font-medium break-all text-ink-900">
            {pending.word}
          </p>
          {pending.anchor ? (
            <p className="mt-0.5 text-caption text-ink-400">#{pending.anchor}</p>
          ) : null}
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveCapture(pending.word, pending.anchor);
              if (e.key === "Escape") setPending(null);
            }}
            placeholder="메모 (선택)"
            aria-label="채집 메모"
            className="mt-2 w-full rounded-ctl border border-hairline-strong bg-inset px-2 py-1 text-sm-token text-ink-900 placeholder:text-ink-400"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-ctl px-2 py-1 text-caption text-ink-600 hover:bg-inset"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => saveCapture(pending.word, pending.anchor)}
              className="rounded-ctl bg-jjok-600 px-2.5 py-1 text-caption font-medium text-sheet hover:bg-jjok-700"
            >
              저장
            </button>
          </div>
        </div>
      ) : null}

      {/* 좌하단 칩 + 목록 패널 */}
      <div className="fixed bottom-4 left-4 z-(--z-hint) flex flex-col items-start gap-2">
        {toast ? (
          <p
            role="status"
            className="rounded-ctl border border-hairline bg-sheet px-2.5 py-1 text-caption text-ink-600 shadow-pop"
          >
            {toast}
          </p>
        ) : null}

        {panelOpen ? (
          <div className="max-h-[60vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-card border border-hairline bg-sheet p-3 shadow-pop">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink-900">채집 백로그</p>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="패널 닫기"
                className="rounded-ctl px-1.5 text-ink-600 hover:bg-inset"
              >
                ✕
              </button>
            </div>

            {/* 키보드 경로 — 선택 없이 직접 추가 */}
            <div className="mt-2 flex gap-1.5">
              <input
                type="text"
                value={manualWord}
                onChange={(e) => setManualWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualWord.trim()) {
                    saveCapture(manualWord);
                    setManualWord("");
                  }
                }}
                placeholder="직접 추가 (Enter)"
                aria-label="백로그에 직접 추가"
                className="min-w-0 flex-1 rounded-ctl border border-hairline-strong bg-inset px-2 py-1 text-sm-token text-ink-900 placeholder:text-ink-400"
              />
            </div>

            {items.length === 0 ? (
              <p className="mt-3 text-caption text-ink-400">
                아직 비어 있습니다 — 본문에서 텍스트를 선택해 보세요.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-ctl bg-inset px-2 py-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium break-all text-ink-900">
                        {item.word}
                      </p>
                      <button
                        type="button"
                        onClick={() => setItems(removeBacklogItem(item.id))}
                        aria-label={`"${item.word}" 삭제`}
                        className="rounded-ctl px-1 text-caption text-ink-400 hover:bg-sheet"
                      >
                        ✕
                      </button>
                    </div>
                    {item.memo ? (
                      <p className="text-caption text-ink-600">{item.memo}</p>
                    ) : null}
                    <p className="text-caption text-ink-400">
                      {item.source.path}
                      {item.source.anchor ? `#${item.source.anchor}` : ""} ·{" "}
                      {item.at.slice(0, 10)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2">
              <button
                type="button"
                onClick={copyExport}
                disabled={items.length === 0}
                className="rounded-ctl border border-hairline-strong px-2 py-1 text-caption text-ink-900 hover:bg-inset disabled:opacity-40"
              >
                JSON 복사
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("백로그를 전부 비울까요?"))
                    setItems(clearBacklog());
                }}
                disabled={items.length === 0}
                className="rounded-ctl px-2 py-1 text-caption text-ink-600 hover:bg-inset disabled:opacity-40"
              >
                비우기
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
          className="rounded-ctl border border-jjok-400 bg-jjok-100 px-2.5 py-1 text-caption font-semibold text-jjok-700 shadow-pop"
        >
          채집 {items.length}
        </button>
      </div>
    </div>
  );
}
