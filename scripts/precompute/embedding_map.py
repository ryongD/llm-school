"""w-embedding-map L2 데이터 생성 (KICKOFF §8.2.3 · §8.3, SPEC-1-3).

FastText 한국어 벡터(cc.ko.300 — CC-BY-SA 3.0)에서 큐레이션 어휘를 추출해
UMAP 2D 좌표 + 원 공간 이웃(k=10) + 유추 결과(top-3)를 JSON으로 저장한다.
재성 로컬에서 실행하고 산출 JSON만 커밋한다.

정직성 원칙(§8.2.3): 이웃·유추는 전부 원 300차원 공간에서 계산한다.
2D 좌표는 표시용 그림자일 뿐이며, 이 사실을 _meta에 기록한다.

사용법 (Python 3.11+):
    pip install -r requirements.txt
    # 벡터 파일(약 1.3GB)은 fasttext.cc 의 cc.ko.300.vec.gz 를 내려받는다:
    #   https://dl.fbaipublicfiles.com/fasttext/vectors-crawl/cc.ko.300.vec.gz
    python embedding_map.py --vectors cc.ko.300.vec.gz \
        --out ../../data/traces/embeddings/
"""

from __future__ import annotations

import argparse
import gzip
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

# ---- 큐레이션 시드 (SPEC-1-3 초안 — 재성 확정 대상) ----------------------

SEED_CATEGORIES: dict[str, list[str]] = {
    "지리": ["서울", "부산", "대구", "인천", "광주", "대전", "한국", "일본",
            "중국", "미국", "프랑스", "영국", "독일", "도쿄", "베이징", "파리",
            "런던", "뉴욕", "도시", "나라", "바다", "산", "강", "섬"],
    "가족": ["아빠", "엄마", "아버지", "어머니", "형", "누나", "오빠", "언니",
            "동생", "이모", "삼촌", "할머니", "할아버지", "딸", "아들", "부모",
            "가족", "부부", "아내", "남편"],
    "사람": ["왕", "여왕", "왕자", "공주", "남자", "여자", "소년", "소녀",
            "사람", "아이", "어른", "친구", "이웃"],
    "감정": ["기쁨", "슬픔", "분노", "사랑", "행복", "불안", "공포", "놀람",
            "미움", "즐거움", "우울", "설렘", "지루함", "외로움", "감동",
            "웃음", "눈물"],
    "음식": ["밥", "김치", "라면", "국수", "빵", "치킨", "피자", "사과",
            "딸기", "바나나", "포도", "커피", "우유", "물", "고기", "생선",
            "채소", "과일", "설탕", "소금"],
    "동물": ["개", "고양이", "호랑이", "사자", "코끼리", "토끼", "곰", "말",
            "소", "돼지", "닭", "새", "물고기", "고래", "원숭이", "강아지"],
    "직업": ["의사", "교사", "간호사", "경찰", "소방관", "요리사", "가수",
            "배우", "작가", "기자", "변호사", "과학자", "개발자", "농부",
            "군인", "학생", "선생님"],
    "시간": ["아침", "점심", "저녁", "밤", "낮", "봄", "여름", "가을", "겨울",
            "어제", "오늘", "내일", "월요일", "일요일", "주말", "시간", "계절"],
    "색": ["빨강", "파랑", "노랑", "초록", "검정", "하양", "보라", "분홍",
          "주황", "회색", "색깔"],
    "학문": ["수학", "과학", "역사", "물리학", "화학", "생물학", "문학",
            "철학", "음악", "미술", "체육", "언어", "공부"],
}

# 유추 후보 (SPEC-1-3 — 실행 결과 품질로 채택 여부 결정)
ANALOGIES: list[tuple[str, str, str]] = [
    ("왕", "남자", "여자"),
    ("서울", "한국", "일본"),
    ("아빠", "남자", "여자"),
    ("형", "남자", "여자"),
    ("파리", "프랑스", "한국"),
]

TARGET_VOCAB = 800  # 지도에 올릴 단어 수 (§8.2.3: 500~1,000)
ANALOGY_POOL = 50_000  # 유추 후보 풀 (빈도 상위 한글 단어)
NEIGHBORS_K = 10
HANGUL_WORD = re.compile(r"^[가-힣]{1,6}$")


def open_vectors(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8", errors="ignore")
    return open(path, "rt", encoding="utf-8", errors="ignore")


def load_vectors(path: Path, seeds: set[str]) -> tuple[list[str], np.ndarray, list[str], np.ndarray]:
    """빈도순(.vec 파일 순서)으로 스트림 파싱.
    반환: (지도 어휘, 지도 벡터, 유추 풀 어휘, 유추 풀 벡터)"""
    map_words: list[str] = []
    map_vecs: list[np.ndarray] = []
    pool_words: list[str] = []
    pool_vecs: list[np.ndarray] = []
    seen: set[str] = set()

    with open_vectors(path) as f:
        header = f.readline()  # "<count> <dim>"
        dim = int(header.split()[1])
        for line in f:
            parts = line.rstrip().split(" ")
            word = parts[0]
            if word in seen or not HANGUL_WORD.match(word):
                continue
            if len(parts) != dim + 1:
                continue
            vec = np.asarray(parts[1:], dtype=np.float32)
            seen.add(word)

            if len(pool_words) < ANALOGY_POOL:
                pool_words.append(word)
                pool_vecs.append(vec)
            if word in seeds or (len(map_words) < TARGET_VOCAB and len(word) >= 2):
                if len(map_words) < TARGET_VOCAB or word in seeds:
                    map_words.append(word)
                    map_vecs.append(vec)
            if len(pool_words) >= ANALOGY_POOL and len(map_words) >= TARGET_VOCAB and seeds <= seen:
                break

    missing = seeds - seen
    if missing:
        print(f"[embedding_map] 경고: 시드 {len(missing)}개를 벡터에서 못 찾음 → 제외: {sorted(missing)}")
    return map_words, np.vstack(map_vecs), pool_words, np.vstack(pool_vecs)


def normalize(m: np.ndarray) -> np.ndarray:
    return m / (np.linalg.norm(m, axis=1, keepdims=True) + 1e-12)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vectors", required=True, help="cc.ko.300.vec(.gz) 경로")
    parser.add_argument("--out", required=True, help="산출 디렉토리")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    seeds = {w for words in SEED_CATEGORIES.values() for w in words}
    for a in ANALOGIES:
        seeds.update(a)

    print(f"[embedding_map] 벡터 스트림 파싱: {args.vectors}")
    words, vecs, pool_words, pool_vecs = load_vectors(Path(args.vectors), seeds)
    print(f"[embedding_map] 지도 어휘 {len(words)}개, 유추 풀 {len(pool_words)}개")

    vecs_n = normalize(vecs)
    pool_n = normalize(pool_vecs)
    pool_index = {w: i for i, w in enumerate(pool_words)}

    # 원 공간 이웃 k=10 (큐레이션 집합 내부 기준 — _meta에 명시)
    sims = vecs_n @ vecs_n.T
    np.fill_diagonal(sims, -1.0)
    neighbor_idx = np.argsort(-sims, axis=1)[:, :NEIGHBORS_K].tolist()

    # 유추 — 원 공간, 전체 풀 기준, 질의 단어 제외
    analogies = []
    for a, b, c in ANALOGIES:
        if not all(t in pool_index for t in (a, b, c)):
            analogies.append({"expr": f"{a} − {b} + {c}", "terms": [a, b, c], "top": [], "note": "질의 단어가 풀에 없음"})
            continue
        q = pool_n[pool_index[a]] - pool_n[pool_index[b]] + pool_n[pool_index[c]]
        q = q / (np.linalg.norm(q) + 1e-12)
        scores = pool_n @ q
        for t in (a, b, c):
            scores[pool_index[t]] = -1.0
        top = np.argsort(-scores)[:3]
        analogies.append({
            "expr": f"{a} − {b} + {c}",
            "terms": [a, b, c],
            "top": [{"w": pool_words[i], "score": round(float(scores[i]), 4)} for i in top],
        })
        print(f"[embedding_map] {a} − {b} + {c} = {[pool_words[i] for i in top]}")

    # UMAP 2D (시드 고정)
    import umap  # noqa: PLC0415 — 무거운 임포트는 사용 직전에

    reducer = umap.UMAP(n_components=2, random_state=args.seed, n_neighbors=15, min_dist=0.1)
    coords = reducer.fit_transform(vecs_n)
    coords = (coords - coords.min(axis=0)) / (coords.max(axis=0) - coords.min(axis=0) + 1e-12)

    result = {
        "_meta": {
            "source": "fastText cc.ko.300 (CC-BY-SA 3.0)",
            "sourceUrl": "https://fasttext.cc/docs/en/crawl-vectors.html",
            "script": "scripts/precompute/embedding_map.py",
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "seed": args.seed,
            "dim": 300,
            "projection": "UMAP(n_neighbors=15, min_dist=0.1) — 2D는 표시용 그림자",
            "neighborsBasis": f"원 300차원 코사인, 큐레이션 {len(words)}개 집합 내부 기준",
            "analogyBasis": f"원 300차원 코사인, 빈도 상위 {len(pool_words)}개 풀 기준",
        },
        "words": [
            {"w": w, "x": round(float(x), 4), "y": round(float(y), 4)}
            for w, (x, y) in zip(words, coords)
        ],
        "neighbors": neighbor_idx,
        "analogies": analogies,
    }

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "map-2d.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")

    size_kb = out_path.stat().st_size / 1024
    print(f"[embedding_map] 완료: {out_path} ({size_kb:.0f}KB)")
    if size_kb > 300:
        print("[embedding_map] 경고: 300KB 예산 초과(§3.5) — TARGET_VOCAB을 줄이세요")


if __name__ == "__main__":
    main()
