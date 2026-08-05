import type { ButtonHTMLAttributes } from "react";

/**
 * 버튼 기본형 (DESIGN §4.10).
 * Primary 텍스트 색은 var(--bg-sheet)를 쓴다 — 라이트(쪽빛 진남 배경 위 흰 지면색),
 * 다크(밝은 쪽빛 배경 위 어두운 지면색) 양쪽에서 의미·대비가 유지되고
 * 순수 흰색 하드코딩(§2.2 금지)을 피한다.
 */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
}) {
  // 시각 높이 40px, 터치 타깃은 ::after 확장으로 44px 확보 (DESIGN §4.10·§5.4)
  const base =
    "relative inline-flex h-10 items-center justify-center rounded-ctl px-4 text-sm-token font-medium transition-colors duration-(--dur-micro) disabled:opacity-50 after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']";
  const styles =
    variant === "primary"
      ? "bg-jjok-600 text-sheet hover:bg-jjok-700"
      : "border border-hairline-strong bg-transparent text-ink-600 hover:bg-inset";
  return <button type="button" className={`${base} ${styles} ${className}`} {...props} />;
}
