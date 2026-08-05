"use client";

import { useEffect, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

const LABELS: Record<ThemeMode, string> = {
  system: "테마: 시스템",
  light: "테마: 라이트",
  dark: "테마: 다크",
};

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode: ThemeMode) {
  const effective = mode === "system" ? systemTheme() : mode;
  document.documentElement.setAttribute("data-theme", effective);
}

/** 다크 모드 전환 — 시스템 연동 + 수동 토글 (DESIGN §11.1) */
export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setMode(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  useEffect(() => {
    if (mode === null || mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  function cycle() {
    const next: ThemeMode =
      mode === "system" ? "light" : mode === "light" ? "dark" : "system";
    setMode(next);
    if (next === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="rounded-ctl border border-hairline-strong bg-transparent px-3 py-1.5 text-caption text-ink-600 transition-colors duration-(--dur-micro) hover:bg-inset"
      aria-label="테마 전환"
    >
      {/* 마운트 전에는 자리만 유지(저장값을 모르므로) */}
      {mode === null ? "테마" : LABELS[mode]}
    </button>
  );
}
