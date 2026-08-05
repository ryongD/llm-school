/**
 * hex 색 직접 사용 금지 린트 (DESIGN §2·§11.2, KICKOFF §4.6-1).
 * stylelint(color-no-hex)는 CSS만 커버하므로 이 스크립트가 나머지를 잡는다:
 *   - src/ 의 .ts/.tsx (컴포넌트 임의값·인라인 스타일)
 *   - content/ 의 .mdx (본문 인라인 SVG 다이어그램 — CP1 C4 반영: 다이어그램이
 *     가장 많이 사는 곳이 content이므로 여기가 사각지대면 §4.6-1이 무의미하다)
 * MDX의 코드 펜스·인라인 코드는 제외한다(코드 예시 오탐 방지).
 * 예외: src/styles/tokens.css (stylelint 오버라이드와 동일).
 * 의도적 예외가 필요한 줄에는 `hex-allow` 주석을 단다(사용 시 리뷰 대상).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = [path.join(ROOT, "src"), path.join(ROOT, "content")];

// #abc / #abcd / #aabbcc / #aabbccdd 형태만. 뒤에 단어가 이어지면(#dev-1 등) 제외.
const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z-])/g;

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|mdx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let violations = 0;

for (const target of TARGETS) {
  for (const file of walk(target)) {
    const isMdx = file.endsWith(".mdx");
    const lines = fs.readFileSync(file, "utf-8").split("\n");
    let inFence = false;
    lines.forEach((rawLine, i) => {
      let line = rawLine;
      if (isMdx) {
        if (/^\s*```/.test(line)) {
          inFence = !inFence;
          return;
        }
        if (inFence) return; // 코드 펜스 내부는 예시 코드 — 제외
        line = line.replace(/`[^`]*`/g, ""); // 인라인 코드 제외
      }
      if (line.includes("hex-allow")) return;
      const matches = line.match(HEX_RE);
      if (!matches) return;
      violations += matches.length;
      console.log(
        `[ERROR] (hex-in-source) ${path.relative(ROOT, file)}:${i + 1}\n        hex 직접 사용: ${matches.join(", ")} — tokens.css의 CSS 변수를 쓰세요 (DESIGN §2)`,
      );
    });
  }
}

console.log(`\nhex 린트: 위반 ${violations}건`);
if (violations > 0) process.exit(1);
