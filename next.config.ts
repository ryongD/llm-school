import type { NextConfig } from "next";

// 전 페이지 정적 생성 (KICKOFF §3.1 — SSG 중심, GPU 서버 없음 원칙 §2-8)
const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
