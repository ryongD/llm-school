# llm-school (가칭)

> LLM을 기초부터 심화까지, 읽는 게 아니라 **만지면서** 배우는 한국어 학습 사이트.

## 단일 진실 원천

- [docs/KICKOFF.md](docs/KICKOFF.md) — 프로젝트 정의·커리큘럼·정확성 파이프라인·실행 계획
- [docs/DESIGN.md](docs/DESIGN.md) — 디자인 시스템 (KICKOFF §9를 대체·상세화)

구현과 문서가 충돌하면 문서를 먼저 확인하고, 판단이 필요하면 재성에게 질문한다.

## 개발

```bash
npm run dev          # velite --watch + next dev
npm run build        # velite --strict + next build (정적 export → out/)
npm run test         # vitest — 위젯 골든 테스트 (KICKOFF §5.6)
npm run typecheck    # tsc --noEmit
npm run lint:content # 콘텐츠 린트 (KICKOFF §4.5 배포 차단 조건)
npm run lint:styles  # stylelint(color-no-hex) + TSX hex 스캔 (DESIGN §2)
npm run ci           # 위 전부 (CI와 동일)
```

## 구조 (KICKOFF §3.4)

- `content/` — 커리큘럼·용어사전·논문 정독·부록 (MDX, Velite 스키마 강제)
- `data/` — facts(시효성 수치)·traces(L2 사전계산)·refs(참고문헌 DB)
- `scripts/` — 콘텐츠 린트, precompute(Python, 재성 로컬 실행)
- `src/` — app 라우트, widgets(레지스트리 패턴), components/mdx, lib
- `docs/templates/` — SPEC·VERIFY·REVIEW 게이트 템플릿

## 품질 게이트

챕터는 5게이트(SPEC → DRAFT → 별도 세션 VERIFY → TEST → REVIEW)를 통과해야
`published`가 되며, 프로덕션 빌드에는 published만 노출된다. 사실성 규칙은
KICKOFF §11.2 — **모르면 지어내지 않고 TODO-VERIFY로 남긴다.**
