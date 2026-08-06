"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  centerOn,
  embeddingMap,
  findAnalogy,
  findWordIndex,
  neighborsOf,
  pickNearest,
  Transform,
  WIDGET_ANALOGIES,
  worldToScreen,
  zoomAt,
} from "./logic";

/**
 * w-embedding-map UI (SPEC-1-3 v2, DESIGN §5).
 * - 캔버스 산점도: 드래그 팬 · 휠/핀치 줌 · 탭으로 단어 선택
 * - 키보드 대체 경로(§8): 검색 입력 + 이웃 칩 + 유추 버튼 (캔버스 없이도
 *   전 기능 접근 가능), 시각화 요약 텍스트 상시 갱신
 * - 정직성 장치: "2D는 그림자" 고정 캡션, 이웃·유추는 원 공간 계산 명시,
 *   파리 유추(서울 2위)는 한계를 그대로 노출
 */

const PAD = 24;
const CANVAS_H = 380;
const LABEL_ZOOM = 2.6;

/** 파리 케이스의 정직 노트 (SPEC-1-3 v2) */
const ANALOGY_NOTES: Record<string, string> = {
  "파리 − 프랑스 + 한국":
    "기대한 답 '서울'은 2위입니다 — 유추가 항상 1위로 답하지는 않습니다.",
};

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function EmbeddingMapWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<Transform>({ s: 1, ox: PAD, oy: PAD });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragRef = useRef<{ moved: boolean; lastX: number; lastY: number; lastDist: number | null }>({
    moved: false,
    lastX: 0,
    lastY: 0,
    lastDist: null,
  });
  const colorsRef = useRef<Record<string, string>>({});
  const sizeRef = useRef({ w: 600, h: CANVAS_H });

  const [selected, setSelected] = useState<number | null>(null);
  const [analogyExpr, setAnalogyExpr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const neighborSet = useMemo(
    () => new Set(selected === null ? [] : neighborsOf(selected)),
    [selected],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = colorsRef.current;
    const t = transformRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const showAllLabels = t.s >= LABEL_ZOOM;
    ctx.font = "13px 'Pretendard Variable', Pretendard, sans-serif";

    embeddingMap.words.forEach((word, i) => {
      const p = worldToScreen(word.x, word.y, t, w, h, PAD);
      if (p.x < -30 || p.x > w + 30 || p.y < -30 || p.y > h + 30) return;

      const isSelected = i === selected;
      const isNeighbor = neighborSet.has(i);

      if (isSelected) {
        ctx.fillStyle = c.jjok600;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (isNeighbor) {
        ctx.fillStyle = c.jjok500;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = c.ink400;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (isSelected || isNeighbor || showAllLabels) {
        ctx.fillStyle = isSelected ? c.jjok700 : isNeighbor ? c.ink900 : c.ink600;
        ctx.fillText(word.w, p.x + 7, p.y + 4);
      }
    });
  }, [selected, neighborSet]);

  // 색 토큰 로딩 + 테마 전환 대응 (단일 진입점 유지 — hex 없음)
  useEffect(() => {
    function refreshColors() {
      colorsRef.current = {
        ink400: cssVar("--ink-400"),
        ink600: cssVar("--ink-600"),
        ink900: cssVar("--ink-900"),
        jjok500: cssVar("--jjok-500"),
        jjok600: cssVar("--jjok-600"),
        jjok700: cssVar("--jjok-700"),
      };
      draw();
    }
    refreshColors();
    const observer = new MutationObserver(refreshColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [draw]);

  // 컨테이너 크기 대응 — RO 콜백은 렌더링 스텝에 묶여 지연될 수 있으므로
  // 마운트 시 동기 측정을 먼저 한다(버퍼 600px 고정 버그 방지)
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    function apply() {
      sizeRef.current = { w: wrap!.clientWidth, h: CANVAS_H };
      draw();
    }
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // 휠 줌 — React onWheel은 passive라 preventDefault가 안 먹는다
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const factor = Math.pow(1.0015, -e.deltaY);
      transformRef.current = zoomAt(
        transformRef.current,
        factor,
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
      draw();
    }
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [draw]);

  function selectIndex(i: number | null, center = false) {
    setSelected(i);
    setAnalogyExpr(null);
    if (i !== null && center) {
      const { w, h } = sizeRef.current;
      const scale = Math.max(transformRef.current.s, 3);
      transformRef.current = centerOn(embeddingMap.words[i], scale, w, h, PAD);
    }
  }

  // ---- 포인터(드래그 팬 + 핀치 줌 + 탭 선택) ----

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 이미 해제된 포인터 — 캡처 없이 계속 (탭 판정에는 지장 없음)
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragRef.current = { moved: false, lastX: e.clientX, lastY: e.clientY, lastDist: null };
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const pointers = pointersRef.current;
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.values()];
    const drag = dragRef.current;

    if (pts.length === 1) {
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      transformRef.current = {
        ...transformRef.current,
        ox: transformRef.current.ox + dx,
        oy: transformRef.current.oy + dy,
      };
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      draw();
    } else if (pts.length === 2) {
      drag.moved = true;
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (drag.lastDist !== null && dist > 0) {
        const rect = e.currentTarget.getBoundingClientRect();
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
        transformRef.current = zoomAt(
          transformRef.current,
          dist / drag.lastDist,
          midX,
          midY,
        );
        draw();
      }
      drag.lastDist = dist;
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(e.pointerId);
    dragRef.current.lastDist = null;
    if (!dragRef.current.moved && pointersRef.current.size === 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const { w, h } = sizeRef.current;
      const hit = pickNearest(
        embeddingMap.words,
        e.clientX - rect.left,
        e.clientY - rect.top,
        transformRef.current,
        w,
        h,
        PAD,
        14,
      );
      selectIndex(hit);
    }
  }

  function zoomButtons(factor: number) {
    const { w, h } = sizeRef.current;
    transformRef.current = zoomAt(transformRef.current, factor, w / 2, h / 2);
    draw();
  }

  function resetView() {
    transformRef.current = { s: 1, ox: PAD, oy: PAD };
    selectIndex(null);
    draw();
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const idx = findWordIndex(query.trim());
    if (idx >= 0) selectIndex(idx, true);
  }

  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return embeddingMap.words
      .map((word, i) => ({ w: word.w, i }))
      .filter(({ w }) => w.startsWith(q) && w !== q)
      .slice(0, 6);
  }, [query]);

  const analogy = analogyExpr ? findAnalogy(analogyExpr) : undefined;
  const selectedWord = selected === null ? null : embeddingMap.words[selected];
  const neighborWords = useMemo(
    () =>
      selected === null
        ? []
        : neighborsOf(selected).map((i) => ({ w: embeddingMap.words[i].w, i })),
    [selected],
  );

  return (
    <div className="flex flex-col gap-3 p-5">
      {/* 검색 + 유추 버튼 — 캔버스 없이도 쓰는 키보드 경로 (§8) */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={onSearchSubmit} className="relative min-w-40 flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="단어 검색 (예: 서울, 슬픔, 김치)"
            aria-label="지도에서 단어 검색"
            className="w-full rounded-ctl border border-hairline-strong bg-inset px-3 py-1.5 text-sm-token text-ink-900 placeholder:text-ink-400"
          />
          {suggestions.length > 0 ? (
            <div className="absolute top-full left-0 z-(--z-popover) mt-1 flex flex-wrap gap-1 rounded-card border border-hairline bg-sheet p-2 shadow-pop">
              {suggestions.map(({ w, i }) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setQuery(w);
                    selectIndex(i, true);
                  }}
                  className="rounded-ctl bg-inset px-2 py-0.5 text-caption text-ink-900 hover:bg-jjok-100"
                >
                  {w}
                </button>
              ))}
            </div>
          ) : null}
        </form>
        <div className="flex gap-1" role="group" aria-label="단어 산수 (사전계산 재생)">
          {WIDGET_ANALOGIES.map((expr) => (
            <button
              key={expr}
              type="button"
              onClick={() => {
                setAnalogyExpr(expr);
                const top = findAnalogy(expr)?.top[0]?.w;
                const idx = top ? findWordIndex(top) : -1;
                setSelected(idx >= 0 ? idx : null);
                if (idx >= 0) {
                  const { w, h } = sizeRef.current;
                  transformRef.current = centerOn(
                    embeddingMap.words[idx],
                    Math.max(transformRef.current.s, 3),
                    w,
                    h,
                    PAD,
                  );
                }
              }}
              aria-pressed={analogyExpr === expr}
              className={`rounded-ctl border px-2 py-1 text-caption font-medium transition-colors duration-(--dur-micro) ${
                analogyExpr === expr
                  ? "border-jjok-400 bg-jjok-100 text-jjok-700"
                  : "border-hairline-strong text-ink-600 hover:bg-inset"
              }`}
            >
              {expr}
            </button>
          ))}
        </div>
      </div>

      {/* 캔버스 지도 */}
      <div ref={wrapRef} className="relative">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: CANVAS_H, touchAction: "none" }}
          className="rounded-ctl border border-hairline"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <div className="absolute right-2 bottom-2 flex gap-1">
          <button
            type="button"
            onClick={() => zoomButtons(1.4)}
            aria-label="지도 확대"
            className="size-8 rounded-ctl border border-hairline-strong bg-sheet text-sm-token text-ink-600 hover:bg-inset"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomButtons(1 / 1.4)}
            aria-label="지도 축소"
            className="size-8 rounded-ctl border border-hairline-strong bg-sheet text-sm-token text-ink-600 hover:bg-inset"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetView}
            className="rounded-ctl border border-hairline-strong bg-sheet px-2 text-caption text-ink-600 hover:bg-inset"
          >
            처음 위치
          </button>
        </div>
      </div>

      {/* 유추 결과 패널 */}
      {analogy ? (
        <div className="rounded-ctl bg-inset px-3 py-2">
          <p className="text-sm-token text-ink-900">
            <span className="font-mono">{analogy.expr}</span> ={" "}
            {analogy.top.map((t, i) => (
              <span key={t.w}>
                {i > 0 ? ", " : ""}
                <span className={i === 0 ? "font-semibold" : ""}>
                  {i + 1}위 {t.w}
                </span>{" "}
                <span className="text-caption text-ink-600 tabular">
                  (유사도 {t.score.toFixed(2)})
                </span>
              </span>
            ))}
          </p>
          <p className="mt-1 text-caption text-ink-600">
            {ANALOGY_NOTES[analogy.expr] ??
              "원 300차원 공간에서 계산한 결과의 재생입니다."}
          </p>
        </div>
      ) : null}

      {/* 이웃 칩 — 클릭으로 지도 여행 (키보드 경로) */}
      {selectedWord ? (
        <div>
          <p className="text-caption text-ink-600" role="status">
            선택: <span className="font-semibold text-ink-900">{selectedWord.w}</span>{" "}
            — 원 300차원 공간 기준 이웃 {neighborWords.length}개
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {neighborWords.map(({ w, i }) => (
              <button
                key={w}
                type="button"
                onClick={() => selectIndex(i, true)}
                className="rounded-ctl bg-inset px-2 py-0.5 font-mono text-sm-token text-ink-900 hover:bg-jjok-100"
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-caption text-ink-400" role="status">
          단어를 검색하거나 지도를 탭해 보세요 — 이웃 10개가 함께 표시됩니다.
        </p>
      )}

      {/* 정직 캡션 + 생성 메타 (§8.2.3·§3.3) */}
      <div className="mt-auto flex flex-col gap-1 border-t border-hairline pt-2">
        <p className="text-caption text-ink-400">
          이 지도는 300차원을 2차원으로 눌러 담은 그림자입니다 — 지도에서
          가깝다고 원 공간에서도 다 가까운 것은 아닙니다. 이웃과 유추는 원
          공간에서 계산했습니다.
        </p>
        <p className="text-caption text-ink-400">
          {embeddingMap._meta.source} ·{" "}
          {embeddingMap._meta.script.split("/").pop()} · seed{" "}
          {embeddingMap._meta.seed} · {embeddingMap._meta.generatedAt} 생성.
        </p>
      </div>
    </div>
  );
}
