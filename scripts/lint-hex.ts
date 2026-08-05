/**
 * TS/TSX 소스의 hex 색 직접 사용 금지 린트 (DESIGN §2·§11.2).
 * stylelint(color-no-hex)는 CSS만 커버하므로, 컴포넌트 코드의
 * 임의값(bg-[#fff])·인라인 스타일 hex를 이 스크립트가 잡는다.
 * 예외: src/styles/tokens.css (토큰 정의 지점 — stylelint 오버라이드와 동일).
 * 의도적 예외가 필요한 줄에는 `hex-allow` 주석을 단다(사용 시 리뷰 대상).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

// #abc / #abcd / #aabbcc / #aabbccdd 형태만. 뒤에 단어가 이어지면(#dev-1 등) 제외.
const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z-])/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let violations = 0;

for (const file of walk(SRC)) {
  const lines = fs.readFileSync(file, "utf-8").split("\n");
  lines.forEach((line, i) => {
    if (line.includes("hex-allow")) return;
    const matches = line.match(HEX_RE);
    if (!matches) return;
    violations += matches.length;
    console.log(
      `[ERROR] (hex-in-source) ${path.relative(ROOT, file)}:${i + 1}\n        hex 직접 사용: ${matches.join(", ")} — tokens.css의 CSS 변수를 쓰세요 (DESIGN §2)`,
    );
  });
}

console.log(`\nhex 린트: 위반 ${violations}건`);
if (violations > 0) process.exit(1);
