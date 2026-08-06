import { describe, expect, it } from "vitest";

import { pickNextUnread } from "./progress";

describe("진도 — pickNextUnread", () => {
  const chapters = [{ id: "1-1" }, { id: "1-2" }, { id: "1-3" }];

  it("아무것도 안 읽었으면 첫 챕터", () => {
    expect(pickNextUnread(chapters, new Set())?.id).toBe("1-1");
  });

  it("중간을 건너뛰고 읽었어도 순서상 첫 미완독을 고른다", () => {
    expect(pickNextUnread(chapters, new Set(["1-1", "1-3"]))?.id).toBe("1-2");
  });

  it("전부 읽었으면 null", () => {
    expect(pickNextUnread(chapters, new Set(["1-1", "1-2", "1-3"]))).toBeNull();
  });
});
