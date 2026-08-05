import * as runtime from "react/jsx-runtime";
import type { ComponentType } from "react";

/**
 * Velite가 컴파일한 MDX(function-body 문자열)를 평가해 렌더한다.
 * 빌드 타임(SSG)에만 실행된다. 콘텐츠와 로더의 결합을 얇게 유지하는 지점
 * (KICKOFF §12 R3 — Velite 교체 시 이 파일과 velite.config.ts만 바뀐다).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MDXComponentMap = Record<string, ComponentType<any>>;

function getMDXComponent(code: string): ComponentType<{
  components?: MDXComponentMap;
}> {
  const fn = new Function(code);
  return fn({ ...runtime }).default;
}

export function MDXContent({
  code,
  components,
}: {
  code: string;
  components?: MDXComponentMap;
}) {
  const Component = getMDXComponent(code);
  return <Component components={components} />;
}
