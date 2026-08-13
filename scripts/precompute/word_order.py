"""w-positional의 '어순 섞기' 데모 데이터 (KICKOFF §6 2-4).

같은 낱말을 순서만 바꿔 넣었을 때 모델의 다음 토큰 예측이 실제로 달라지는지
잰다. 어텐션만으로는 순서를 알 수 없다는 훅을, 모델이 순서를 안다는 실측으로
회수하기 위한 데이터다.

두 종류를 기록한다.
  pairs   : 같은 낱말·다른 순서인 두 문장의 다음 토큰 top-k 비교
  probes  : 역할이 뒤바뀐 두 문맥에서 특정 후보(누가 다쳤나 등)의 확률·순위
            비교. 모델이 어순에서 '누가 무엇을 했는지'를 읽어내는지 본다.

**주의**: 1.3B 소형 모델이라 probes가 기대대로 나오지 않을 수 있다. 결과가
어긋나면 숨기지 말고 챕터에서 정직하게 다룬다(1-3의 '왕' 유추와 같은 처리).

**메모리 규약(2026-08-13)**: 스크립트를 먼저 커밋한 뒤 실행한다.
    .venv-precompute/Scripts/python scripts/precompute/word_order.py \
        --model EleutherAI/polyglot-ko-1.3b --out data/traces/word-order/
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_FLAX", "0")

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

TOP_K = 8

# 같은 낱말, 다른 순서 (한국어는 어순 뒤섞기가 자연스럽다)
PAIRS: list[tuple[str, str]] = [
    ("나는 밥을 먹었다", "밥을 나는 먹었다"),
    ("어제 친구가 책을 빌렸다", "친구가 어제 책을 빌렸다"),
]

# 역할 뒤바꾸기 — 같은 낱말이 조사만 바뀌어 주체와 대상이 뒤집힌다.
# (문맥, [후보1, 후보2]) — 후보는 앞에 공백을 붙여 토큰화한다.
PROBES: list[tuple[str, list[str]]] = [
    ("개가 사람을 물었다. 다친 것은", ["사람", "개"]),
    ("사람이 개를 물었다. 다친 것은", ["사람", "개"]),
    ("철수가 영희에게 책을 주었다. 책을 받은 사람은", ["영희", "철수"]),
    ("영희가 철수에게 책을 주었다. 책을 받은 사람은", ["영희", "철수"]),
]


def load(model_name: str):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        dtype=torch.float16 if device == "cuda" else torch.float32,
    ).to(device)
    model.eval()
    return tokenizer, model, device


def next_logprobs(tokenizer, model, device: str, text: str) -> torch.Tensor:
    ids = tokenizer.encode(text)
    with torch.no_grad():
        logits = model(torch.tensor([ids], device=device)).logits[0, -1]
    return torch.log_softmax(logits.float(), dim=-1).cpu()


def topk_entries(tokenizer, logprobs: torch.Tensor, k: int) -> list[dict]:
    top = torch.topk(logprobs, k)
    return [
        {
            "token": tokenizer.decode([int(i)]),
            "id": int(i),
            "logprob": round(float(v), 4),
        }
        for v, i in zip(top.values, top.indices)
    ]


def candidate_entry(tokenizer, logprobs: torch.Tensor, word: str) -> dict:
    """후보의 첫 토큰 확률과 순위. 여러 토큰으로 쪼개지면 첫 조각만 본다."""
    ids = tokenizer.encode(" " + word)
    first = ids[0]
    order = torch.argsort(logprobs, descending=True)
    rank = int((order == first).nonzero()[0]) + 1
    return {
        "word": word,
        "firstToken": tokenizer.decode([first]),
        "id": first,
        "tokenCount": len(ids),
        "logprob": round(float(logprobs[first]), 4),
        "rank": rank,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="EleutherAI/polyglot-ko-1.3b")
    parser.add_argument("--out", help="산출 디렉토리 (--dry-run이면 생략 가능)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    tokenizer, model, device = load(args.model)
    revision = getattr(model.config, "_commit_hash", None) or "local-cache"
    print(f"[word_order] {args.model}@{revision} on {device}")

    pairs = []
    for a, b in PAIRS:
        entry = {"a": {"text": a}, "b": {"text": b}}
        for key, text in (("a", a), ("b", b)):
            lp = next_logprobs(tokenizer, model, device, text)
            entry[key]["tokens"] = [
                tokenizer.decode([i]) for i in tokenizer.encode(text)
            ]
            entry[key]["topk"] = topk_entries(tokenizer, lp, TOP_K)
        top_a = entry["a"]["topk"][0]["token"]
        top_b = entry["b"]["topk"][0]["token"]
        entry["sameTop1"] = top_a == top_b
        pairs.append(entry)
        print(f"[word_order] pair | {a!r} → {top_a!r} / {b!r} → {top_b!r}"
              f" | 1순위 동일: {entry['sameTop1']}")

    probes = []
    for text, words in PROBES:
        lp = next_logprobs(tokenizer, model, device, text)
        cands = [candidate_entry(tokenizer, lp, w) for w in words]
        entry = {
            "text": text,
            "candidates": cands,
            "topk": topk_entries(tokenizer, lp, TOP_K),
        }
        probes.append(entry)
        summary = " / ".join(
            f"{c['word']} {c['rank']}위({c['logprob']:.2f})" for c in cands
        )
        print(f"[word_order] probe | {text!r} → {summary}"
              f" | top1 {entry['topk'][0]['token']!r}")

    if args.dry_run:
        print("[word_order] dry-run — 저장하지 않음")
        return
    if not args.out:
        raise SystemExit("--out 또는 --dry-run 중 하나는 필요합니다")

    result = {
        "_meta": {
            "model": model.config.name_or_path,
            "revision": revision,
            "script": "scripts/precompute/word_order.py",
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "topK": TOP_K,
            "candidateRule": "후보 앞에 공백을 붙여 토큰화하고 첫 토큰만 본다",
            "note": "logprob은 자연로그. 위젯이 %로 되돌려 표시한다",
        },
        "pairs": pairs,
        "probes": probes,
    }

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{args.model.split('/')[-1]}.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    print(f"[word_order] 완료: {out_path} ({out_path.stat().st_size / 1024:.0f}KB)")


if __name__ == "__main__":
    main()
