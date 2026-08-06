"""w-next-token L2 트레이스 생성 (KICKOFF §8.2.2 · §8.3).

재성 로컬(RTX 3080)에서 실행하고 산출 JSON만 리포에 커밋한다.
문장별로 토큰 단위 스텝을 진행하며 각 위치의 top-k 로그확률과
실제 다음 토큰(및 그 순위)을 기록한다. 샘플링이 없는 결정적 연산이라
같은 모델·리비전이면 재현된다(§8.3 — 시드는 메타 기록용).

사용법 — 전용 가상환경 권장(requirements.txt 상단 안내 참조):
    .venv-precompute/Scripts/pip install -r scripts/precompute/requirements.txt
    .venv-precompute/Scripts/python scripts/precompute/next_token.py \
        --model EleutherAI/polyglot-ko-1.3b --out data/traces/next-token/

산출: {out}/{모델 짧은 이름}.json — 최상단 _meta에 모델명·리비전·스크립트·
생성일·시드 포함(위젯 캡션에 노출됨, §3.3).
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

# 이 스크립트는 torch만 쓴다. 같은 환경에 설치된 TensorFlow/Flax가 NumPy
# 버전 충돌 등으로 깨져 있어도 transformers가 그걸 임포트하다 죽지 않도록
# 명시적으로 끈다 (Anaconda 기본 환경에서 실제 발생 — 2026-08-06).
os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_FLAX", "0")

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# 큐레이션 문장 (SPEC-1-2 초안 — 재성 확정 후 필요 시 수정)
SENTENCES = [
    "오늘 점심은 김치찌개를 먹었다.",
    "대한민국의 수도는 서울이다.",
    "가는 말이 고와야 오는 말이 곱다.",
    "원숭이 엉덩이는 빨개, 빨가면 사과.",
    "어젯밤 꿈에서 하늘을 나는 고래를 봤다.",
    "물은 백 도에서 끓는다.",
    "그 영화는 생각보다 재미있었다.",
    "배가 고파서 라면을 끓여 먹었다.",
    "세 살 버릇 여든까지 간다.",
    "겨울이 지나면 봄이 온다.",
]

TOP_K = 8  # 추출 k (§8.2.2) — 위젯 표시는 top-5


def piece_text(tokenizer, token_id: int) -> str:
    """단일 토큰의 표시용 문자열. 바이트 조각 등 단독 디코드가 불완전한
    경우도 있는 그대로 보여준다(정직성 — 1-1과 동일한 태도)."""
    text = tokenizer.decode([token_id])
    return text


def trace_sentence(model, tokenizer, sentence: str, device: str) -> dict:
    ids = tokenizer.encode(sentence)
    tokens = [piece_text(tokenizer, i) for i in ids]

    steps = []
    with torch.no_grad():
        # 문맥 길이 1부터: [0..i)를 보고 i번째 토큰을 예측하는 각 스텝
        for i in range(1, len(ids)):
            context = torch.tensor([ids[:i]], device=device)
            logits = model(context).logits[0, -1]
            logprobs = torch.log_softmax(logits.float(), dim=-1)

            top = torch.topk(logprobs, TOP_K)
            actual_id = ids[i]
            actual_logprob = logprobs[actual_id].item()
            # 실제 토큰의 순위 (1-기준) — 어설픈 예측을 숨기지 않는 지표
            actual_rank = int((logprobs > logprobs[actual_id]).sum().item()) + 1

            steps.append(
                {
                    "position": i,
                    "topk": [
                        {
                            "id": int(tid),
                            "token": piece_text(tokenizer, int(tid)),
                            "logprob": round(float(lp), 4),
                        }
                        for lp, tid in zip(top.values.tolist(), top.indices.tolist())
                    ],
                    "actual": {
                        "id": int(actual_id),
                        "token": tokens[i],
                        "logprob": round(actual_logprob, 4),
                        "rank": actual_rank,
                    },
                }
            )

    return {"text": sentence, "tokens": tokens, "steps": steps}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, help="HF 모델 id (예: EleutherAI/polyglot-ko-1.3b)")
    parser.add_argument("--revision", default="main", help="모델 리비전 (재현성 고정용)")
    parser.add_argument("--seed", type=int, default=42, help="메타 기록용 시드")
    parser.add_argument("--out", required=True, help="산출 디렉토리")
    parser.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    args = parser.parse_args()

    torch.manual_seed(args.seed)

    print(f"[next_token] 모델 로딩: {args.model}@{args.revision} ({args.device})")
    tokenizer = AutoTokenizer.from_pretrained(args.model, revision=args.revision)
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        revision=args.revision,
        dtype=torch.float16 if args.device == "cuda" else torch.float32,
    ).to(args.device)
    model.eval()

    sentences = [trace_sentence(model, tokenizer, s, args.device) for s in SENTENCES]

    result = {
        "_meta": {
            "model": args.model,
            "revision": args.revision,
            "script": "scripts/precompute/next_token.py",
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "seed": args.seed,
            "topK": TOP_K,
        },
        "sentences": sentences,
    }

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    short_name = args.model.split("/")[-1]
    out_path = out_dir / f"{short_name}.json"
    out_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    size_kb = out_path.stat().st_size / 1024
    total_steps = sum(len(s["steps"]) for s in sentences)
    print(f"[next_token] 완료: {out_path} ({size_kb:.0f}KB, 문장 {len(sentences)}개, 스텝 {total_steps}개)")
    if size_kb > 300:
        print("[next_token] 경고: 300KB 예산 초과(§3.5) — 문장 수를 줄이거나 분할 필요")


if __name__ == "__main__":
    main()
