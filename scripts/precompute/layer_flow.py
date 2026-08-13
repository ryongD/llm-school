"""w-layer-flow L2 데이터 생성 (KICKOFF §6 2-3).

한 토큰의 표현이 층을 지나며 얼마나 변하는지를 뽑는다. 산출 JSON만 커밋.

기록하는 값(전부 층별, 토큰별):
  - drift: 직전 층 대비 코사인 유사도 (1에 가까울수록 그 층에서 덜 변함)
  - fromInput: 입력 임베딩(0층) 대비 코사인 유사도 (원본이 얼마나 남았나)
  - norm: 표현 벡터의 길이 (층을 지나며 커지는지)

**메모리 주의 (2026-08-13 세션 강제종료 후 규약)**: 1.3B 모델을 올린 뒤
25개 층의 은닉 상태를 전부 붙들면 메모리를 크게 쓴다. 그래서
  1) 문장을 하나씩 처리하고 즉시 요약 수치로 줄여 은닉 상태를 버린다
  2) --limit 으로 문장 수를 제한해 시험 실행할 수 있다
  3) 실행 전 dev 서버·브라우저를 닫는다
스크립트를 먼저 커밋한 뒤 실행할 것 — 크래시가 나도 코드는 남는다.

사용법 — 반드시 전용 가상환경(.venv-precompute)에서:
    # 시험 실행 (문장 1개, 메모리 확인용)
    .venv-precompute/Scripts/python scripts/precompute/layer_flow.py \
        --model EleutherAI/polyglot-ko-1.3b --limit 1 --dry-run
    # 본생성
    .venv-precompute/Scripts/python scripts/precompute/layer_flow.py \
        --model EleutherAI/polyglot-ko-1.3b --out data/traces/layer-flow/
"""

from __future__ import annotations

import argparse
import gc
import json
import os
from datetime import datetime, timezone
from pathlib import Path

# torch 전용 — 깨진 TF/Flax 임포트 방지 (다른 precompute 스크립트와 동일 가드)
os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_FLAX", "0")

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# 큐레이션 문장 — 2-1/2-2 위젯과 같은 문장을 쓴다. 같은 문장을 챕터마다
# 다른 각도로 보는 편이 독자에게 이득이고(2-1에서 이미 만진 문장), 층별
# 변화도 어텐션 결과와 나란히 놓고 볼 수 있다.
SENTENCES = [
    "나는 배를 타고 가며 배를 먹었다.",
    "동생이 사과를 씻어서 그것을 맛있게 먹었다.",
    "빨간 모자를 쓴 소녀가 어두운 숲을 걸었다.",
    "가는 말이 고와야 오는 말이 곱다.",
    "비가 와서 우산을 챙겼다.",
    "서울에서 출발한 기차가 부산에 도착했다.",
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


def sentence_flow(tokenizer, model, device: str, text: str) -> dict:
    """한 문장의 층별 요약 수치. 은닉 상태는 이 함수 안에서 버린다."""
    ids = tokenizer.encode(text)
    tokens = [tokenizer.decode([i]) for i in ids]

    with torch.no_grad():
        out = model(torch.tensor([ids], device=device), output_hidden_states=True)
        # hidden_states: (층수+1) 개의 [1, seq, dim] — 0번이 입력 임베딩
        hs = [h[0].float().cpu() for h in out.hidden_states]
    del out

    layers = len(hs)
    seq = len(tokens)

    def cos(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
        return torch.nn.functional.cosine_similarity(a, b, dim=-1)

    drift: list[list[int]] = []      # 층 L: 직전 층 대비 (0층은 없음)
    from_input: list[list[int]] = []  # 층 L: 0층 대비
    norms: list[list[int]] = []

    for layer in range(layers):
        cur = hs[layer]
        norms.append([int(round(float(v))) for v in cur.norm(dim=-1)])
        from_input.append([int(round(float(v) * 100)) for v in cos(cur, hs[0])])
        if layer == 0:
            drift.append([100] * seq)
        else:
            drift.append([int(round(float(v) * 100)) for v in cos(cur, hs[layer - 1])])

    del hs
    gc.collect()

    return {
        "text": text,
        "tokens": tokens,
        "drift": drift,
        "fromInput": from_input,
        "norm": norms,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="EleutherAI/polyglot-ko-1.3b")
    parser.add_argument("--out", help="산출 디렉토리 (--dry-run이면 생략 가능)")
    parser.add_argument("--limit", type=int, help="처리할 문장 수 제한(시험 실행)")
    parser.add_argument("--dry-run", action="store_true", help="저장하지 않고 요약만 출력")
    args = parser.parse_args()

    tokenizer, model, device = load(args.model)
    revision = getattr(model.config, "_commit_hash", None) or "local-cache"
    print(f"[layer_flow] {args.model}@{revision} on {device}")

    targets = SENTENCES[: args.limit] if args.limit else SENTENCES
    sentences = []
    for i, text in enumerate(targets, 1):
        entry = sentence_flow(tokenizer, model, device, text)
        sentences.append(entry)
        last = entry["drift"][-1]
        print(f"[layer_flow] ({i}/{len(targets)}) {text}"
              f" | 토큰 {len(entry['tokens'])}개"
              f" | 마지막 층 직전대비 {min(last)}~{max(last)}")

    if args.dry_run:
        print("[layer_flow] dry-run — 저장하지 않음")
        return
    if not args.out:
        raise SystemExit("--out 또는 --dry-run 중 하나는 필요합니다")

    result = {
        "_meta": {
            "model": model.config.name_or_path,
            "revision": revision,
            "script": "scripts/precompute/layer_flow.py",
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "layersTotal": model.config.num_hidden_layers,
            "statesStored": "입력 임베딩 + 각 층 출력 (총 층수+1개)",
            "drift": "직전 층 대비 코사인 유사도 ×100 (0층은 100으로 채움)",
            "fromInput": "입력 임베딩 대비 코사인 유사도 ×100",
            "norm": "표현 벡터의 길이(반올림 정수)",
        },
        "sentences": sentences,
    }

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{args.model.split('/')[-1]}.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    print(f"[layer_flow] 완료: {out_path} ({size_kb:.0f}KB)")
    if size_kb > 300:
        print("[layer_flow] 경고: 300KB 예산 초과(§3.5) — 문장 수를 줄이세요")


if __name__ == "__main__":
    main()
