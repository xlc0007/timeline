import { describe, expect, it } from "vitest";
import type { Plan } from "./types";
import { collectTags, filterPlans, matchesKeyword, statusOf } from "./filter";

const TODAY = "2024-06-15";

function plan(partial: Partial<Plan> & { id: string }): Plan {
  return {
    title: "计划",
    description: "",
    start_date: "2024-06-01",
    end_date: "2024-06-30",
    tags: [],
    archived: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...partial,
  };
}

describe("状态判定", () => {
  it("未来/进行中/已结束/已归档", () => {
    expect(statusOf(plan({ id: "1", start_date: "2024-07-01", end_date: "2024-07-10" }), TODAY)).toBe("future");
    expect(statusOf(plan({ id: "2", start_date: "2024-06-10", end_date: "2024-06-20" }), TODAY)).toBe("ongoing");
    expect(statusOf(plan({ id: "3", start_date: "2024-06-01", end_date: "2024-06-14" }), TODAY)).toBe("ended");
    expect(statusOf(plan({ id: "4", archived: true }), TODAY)).toBe("archived");
  });

  it("边界：开始=今天 视为进行中", () => {
    expect(statusOf(plan({ id: "5", start_date: "2024-06-15", end_date: "2024-06-16" }), TODAY)).toBe("ongoing");
  });

  it("边界：结束=今天 视为进行中", () => {
    expect(statusOf(plan({ id: "6", start_date: "2024-06-14", end_date: "2024-06-15" }), TODAY)).toBe("ongoing");
  });
});

describe("关键字与标签匹配", () => {
  it("关键字匹配标题/描述", () => {
    expect(matchesKeyword(plan({ id: "1", title: "学习 React" }), "react")).toBe(true);
    expect(matchesKeyword(plan({ id: "2", description: "写 TypeScript" }), "typescript")).toBe(true);
    expect(matchesKeyword(plan({ id: "3", title: "abc" }), "xyz")).toBe(false);
    expect(matchesKeyword(plan({ id: "4" }), "")).toBe(true);
  });

  it("标签匹配（任一命中）", () => {
    const p = plan({ id: "1", tags: ["工作", "学习"] });
    expect(filterPlans([p], { keyword: "", tags: ["工作"], categories: [], status: "all" }, TODAY)).toHaveLength(1);
    expect(filterPlans([p], { keyword: "", tags: ["运动"], categories: [], status: "all" }, TODAY)).toHaveLength(0);
  });
});

describe("综合筛选", () => {
  const plans = [
    plan({ id: "a", title: "短期任务", start_date: "2024-06-01", end_date: "2024-06-10", tags: ["工作"] }),
    plan({ id: "b", title: "中期项目", start_date: "2024-06-01", end_date: "2024-08-31", tags: ["学习"] }),
    plan({ id: "c", title: "长期规划", start_date: "2024-06-01", end_date: "2025-06-01", tags: ["生活"] }),
    plan({ id: "d", title: "已归档", start_date: "2024-01-01", end_date: "2024-01-31", archived: true }),
  ];

  it("按分类筛选", () => {
    const r = filterPlans(plans, { keyword: "", tags: [], categories: ["long"], status: "all" }, TODAY);
    expect(r.map((p) => p.id)).toEqual(["c"]);
  });

  it("按状态筛选已归档", () => {
    const r = filterPlans(plans, { keyword: "", tags: [], categories: [], status: "archived" }, TODAY);
    expect(r.map((p) => p.id)).toEqual(["d"]);
  });

  it("关键字 + 分类组合", () => {
    const r = filterPlans(plans, { keyword: "长期", tags: [], categories: ["long"], status: "all" }, TODAY);
    expect(r.map((p) => p.id)).toEqual(["c"]);
  });

  it("无筛选返回全部", () => {
    const r = filterPlans(plans, { keyword: "", tags: [], categories: [], status: "all" }, TODAY);
    expect(r).toHaveLength(4);
  });
});

describe("collectTags", () => {
  it("去重排序", () => {
    const plans = [
      plan({ id: "1", tags: ["b", "a"] }),
      plan({ id: "2", tags: ["a", "c"] }),
    ];
    expect(collectTags(plans)).toEqual(["a", "b", "c"]);
  });
});
