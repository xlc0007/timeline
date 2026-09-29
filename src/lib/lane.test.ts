import { describe, expect, it } from "vitest";
import { assignLanes } from "./lane";

describe("重叠分轨", () => {
  it("无重叠全部同轨", () => {
    const m = assignLanes([
      { id: "a", start: 1, end: 5 },
      { id: "b", start: 6, end: 10 },
      { id: "c", start: 11, end: 15 },
    ]);
    expect(m.get("a")).toBe(0);
    expect(m.get("b")).toBe(0);
    expect(m.get("c")).toBe(0);
  });

  it("完全重叠分到不同轨", () => {
    const m = assignLanes([
      { id: "a", start: 1, end: 10 },
      { id: "b", start: 1, end: 10 },
      { id: "c", start: 1, end: 10 },
    ]);
    expect(m.get("a")).toBe(0);
    expect(m.get("b")).toBe(1);
    expect(m.get("c")).toBe(2);
  });

  it("边界相邻（end == start）视为重叠", () => {
    const m = assignLanes([
      { id: "a", start: 1, end: 5 },
      { id: "b", start: 5, end: 10 },
    ]);
    // a.end(5) < b.start(5) 为假 → 重叠，分到不同轨
    expect(m.get("a")).not.toBe(m.get("b"));
  });

  it("交错重叠复用空轨", () => {
    const m = assignLanes([
      { id: "a", start: 1, end: 6 },
      { id: "b", start: 2, end: 4 },
      { id: "c", start: 7, end: 9 },
    ]);
    // a 轨0, b 轨1（与 a 重叠），c 可与 a 同轨（7 > 6）
    expect(m.get("a")).toBe(0);
    expect(m.get("b")).toBe(1);
    expect(m.get("c")).toBe(0);
  });

  it("乱序输入结果稳定", () => {
    const items = [
      { id: "b", start: 2, end: 4 },
      { id: "a", start: 1, end: 6 },
      { id: "c", start: 7, end: 9 },
    ];
    const m = assignLanes(items);
    expect(m.get("a")).toBe(0);
    expect(m.get("b")).toBe(1);
    expect(m.get("c")).toBe(0);
  });

  it("空输入", () => {
    expect(assignLanes([]).size).toBe(0);
  });
});
