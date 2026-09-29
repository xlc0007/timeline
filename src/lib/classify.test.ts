import { describe, expect, it } from "vitest";
import { CATEGORIES, categoryOf, classify } from "./classify";

describe("分类边界（短<30 / 中30–180含边界 / 长>180）", () => {
  it("短期 <30", () => {
    expect(classify(1)).toBe("short");
    expect(classify(29)).toBe("short");
  });

  it("中期 30–180 含边界", () => {
    expect(classify(30)).toBe("medium");
    expect(classify(180)).toBe("medium");
    expect(classify(100)).toBe("medium");
  });

  it("长期 >180", () => {
    expect(classify(181)).toBe("long");
    expect(classify(365)).toBe("long");
  });
});

describe("categoryOf 由起止日期计算", () => {
  it("含边界", () => {
    expect(categoryOf("2024-01-01", "2024-01-29")).toBe("short");
    expect(categoryOf("2024-01-01", "2024-01-30")).toBe("medium");
    expect(categoryOf("2024-01-01", "2024-06-28")).toBe("medium");
    expect(categoryOf("2024-01-01", "2024-06-29")).toBe("long");
  });
});

describe("分类元数据", () => {
  it("三种分类与颜色齐全", () => {
    expect(CATEGORIES.map((c) => c.key)).toEqual(["short", "medium", "long"]);
    for (const c of CATEGORIES) {
      expect(c.label).toBeTruthy();
      expect(c.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
