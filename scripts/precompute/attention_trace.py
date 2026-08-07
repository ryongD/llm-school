"""w-attention L2 트레이스 생성 (KICKOFF §6 2-1·2-2, SPEC-2-1 초안).

큐레이션 한국어 문장의 실제 어텐션 가중치를 추출한다. 산출 JSON만 커밋.

중요 — 인과(causal) 모델의 사실: polyglot 계열(GPT-NeoX)은 각 토큰이
"앞 토큰만" 쳐다본다. KICKOFF 2-1 아하 문구("'배'가 '타고'를 쳐다본다")는
양방향 모델의 그림이라, 실제로는 뒤 토큰('타고')이 앞의 '배'를 쳐다보는
방향으로 서술해야 한다. --inspect 로 실측을 확인해 SPEC을 확정할 것.

사용법 — 반드시 전용 가상환경(.venv-precompute)에서:
    .venv-precompute/Scripts/python scripts/precompute/attention_trace.py \
        --model EleutherAI/polyglot-ko-1.3b --inspect          # 실측 요약만
    .venv-precompute/Scripts/python scripts/precompute/attention_trace.py \
        --model EleutherAI/polyglot-ko-1.3b --out data/traces/attention/
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

# torch 전용 — 깨진 TF/Flax 임포트 방지 (next_token.py와 동일한 가드)
os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_FLAX", "0")

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# 큐레이션 문장 (SPEC-2-1 초안 — 재성 확정 대상).
# 선정 기준: 동음이의(훅 문장), 대명사 참조, 수식-피수식, 주어-서술 호응,
# 1-2와의 연속성(속담 재사용) 등 "쳐다보기"가 보일 만한 관계들.
SENTENCES = [
    "나는 배를 타고 가며 배를 먹었다.",
    "동생이 사과를 씻어서 그것을 맛있게 먹었다.",
    "빨간 모자를 쓴 소녀가 어두운 숲을 걸었다.",
    "가는 말이 고와야 오는 말이 곱다.",
    "할머니는 시장에서 산 생선을 저녁에 구웠다.",
    "비가 와서 우산을 챙겼다.",
    "그 학생은 어제 빌린 책을 아직 읽고 있다.",
    "서울에서 출발한 기차가 부산에 도착했다.",
]

# 24층 중 6개 층 수록 (§3.5 용량 예산). L2 포함 필수 — 실측에서 훅 서사의
# 스타 층('타고→배' L2H15=0.94, '먹→배' L2H8=0.90, 2026-08-07 probe)
DEFAULT_LAYERS = "0,2,5,11,17,23"
TOP_K = 3  # 질의 토큰당 저장하는 상위 어텐션 대상 수 (4는 305KB로 예산 초과 — 2026-08-07 실측)


def load(model_name: str):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        dtype=torch.float16 if device == "cuda" else torch.float32,
        attn_implementation="eager",  # output_attentions 지원 경로 강제
    ).to(device)
    model.eval()
    revision = getattr(model.config, "_commit_hash", None) or "local-cache"
    return tokenizer, model, device, revision


def sentence_attentions(tokenizer, model, device: str, text: str):
    """반환: (표시 토큰 목록, attn[L, H, S, S] — 행별 softmax 합 1)"""
    ids = tokenizer.encode(text)
    tokens = [tokenizer.decode([i]) for i in ids]
    with torch.no_grad():
        out = model(torch.tensor([ids], device=device), output_attentions=True)
    attn = torch.stack(out.attentions)[:, 0].float().cpu()  # [L, H, S, S]
    return tokens, attn


def inspect(tokenizer, model, device: str) -> None:
    """헤드 평균 어텐션으로 '누가 누구를 쳐다보는가' 실측 요약 출력."""
    for text in SENTENCES:
        tokens, attn = sentence_attentions(tokenizer, model, device, text)
        mean = attn.mean(dim=1)  # [L, S, S]
        print(f"\n=== {text}")
        print(f"    토큰({len(tokens)}): {tokens}")
        for layer in (0, 5, 11, 17, 23):
            rows = []
            for q in range(1, len(tokens)):
                w = mean[layer, q, :q + 1]
                top = torch.topk(w, min(3, q + 1))
                pairs = ", ".join(
                    f"{tokens[j]}({w[j]:.2f})" for j in top.indices.tolist()
                )
                rows.append(f"{tokens[q]}→[{pairs}]")
            print(f"  L{layer:02d}: " + " | ".join(rows))


def build_trace(tokenizer, model, device: str, layers: list[int]) -> dict:
    sentences = []
    for text in SENTENCES:
        tokens, attn = sentence_attentions(tokenizer, model, device, text)
        seq = len(tokens)
        per_layer = {}
        for layer in layers:
            heads = []
            for h in range(attn.shape[1]):
                rows = []
                for q in range(seq):
                    w = attn[layer, h, q, : q + 1]
                    k = min(TOP_K, q + 1)
                    top = torch.topk(w, k)
                    # [대상 인덱스, 가중치×100 반올림] 쌍 — 용량 절약(§3.5)
                    rows.append(
                        [[int(j), int(round(float(w[j]) * 100))]
                         for j in top.indices.tolist()]
                    )
                heads.append(rows)
            per_layer[str(layer)] = heads
        sentences.append({"text": text, "tokens": tokens, "layers": per_layer})

    num_layers = model.config.num_hidden_layers
    num_heads = model.config.num_attention_heads
    return {
        "_meta": {
            "model": model.config.name_or_path,
            "revision": getattr(model.config, "_commit_hash", None) or "local-cache",
            "script": "scripts/precompute/attention_trace.py",
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "direction": "causal — 각 토큰은 자신과 앞 토큰만 본다 (행별 합 1)",
            "layersStored": layers,
            "layersTotal": num_layers,
            "headsTotal": num_heads,
            "topK": TOP_K,
            "weightScale": "정수 0~100 (가중치 ×100 반올림)",
        },
        "sentences": sentences,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="EleutherAI/polyglot-ko-1.3b")
    parser.add_argument("--out", help="산출 디렉토리 (미지정 + --inspect면 요약만)")
    parser.add_argument("--layers", default=DEFAULT_LAYERS)
    parser.add_argument("--inspect", action="store_true", help="실측 요약 출력")
    args = parser.parse_args()

    tokenizer, model, device, revision = load(args.model)
    print(f"[attention_trace] {args.model}@{revision} on {device}")

    if args.inspect:
        inspect(tokenizer, model, device)
        return

    if not args.out:
        raise SystemExit("--out 또는 --inspect 중 하나는 필요합니다")

    layers = [int(x) for x in args.layers.split(",")]
    trace = build_trace(tokenizer, model, device, layers)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{args.model.split('/')[-1]}.json"
    out_path.write_text(json.dumps(trace, ensure_ascii=False), encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    print(f"[attention_trace] 완료: {out_path} ({size_kb:.0f}KB)")
    if size_kb > 300:
        print("[attention_trace] 경고: 300KB 예산 초과(§3.5) — 문장·층·TOP_K를 줄이세요")


if __name__ == "__main__":
    main()
