import { describe, expect, it } from "vitest";
import type { Plan } from "./types";
import {
  buildExportJson,
  parseImportJson,
  previewImportErrors,
  SCHEMA_VERSION,
  validateImportItem,
} from "./importExport";

describe("parseImportJson", () => {
  it("接受合法 JSON", () => {
    const parsed = parseImportJson(
      JSON.stringify({ schemaVersion: 1, exportedAt: "x", plans: [] }),
    );
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.plans).toEqual([]);
  });

  it("拒绝非法 JSON", () => {
    expect(() => parseImportJson("not json")).toThrow();
  });

  it("拒绝错误 schemaVersion", () => {
    expect(() =>
      parseImportJson(JSON.stringify({ schemaVersion: 999, plans: [] })),
    ).toThrow(/schemaVersion/);
  });

  it("拒绝缺少 schemaVersion", () => {
    expect(() => parseImportJson(JSON.stringify({ plans: [] }))).toThrow();
  });

  it("拒绝缺少 plans 数组", () => {
    expect(() =>
      parseImportJson(JSON.stringify({ schemaVersion: 1 })),
    ).toThrow(/plans/);
  });
});

describe("validateImportItem", () => {
  it("合法项通过", () => {
    expect(
      validateImportItem(
        { id: "1", title: "计划", start_date: "2024-01-01", end_date: "2024-01-10" },
        0,
      ),
    ).toBe("");
  });

  it("标题为空失败", () => {
    expect(
      validateImportItem(
        { title: "  ", start_date: "2024-01-01", end_date: "2024-01-10" },
        0,
      ),
    ).toContain("标题");
  });

  it("日期非法失败", () => {
    expect(
      validateImportItem(
        { title: "x", start_date: "2024-02-30", end_date: "2024-03-01" },
        0,
      ),
    ).toContain("start_date");
  });

  it("结束早于开始失败", () => {
    expect(
      validateImportItem(
        { title: "x", start_date: "2024-03-01", end_date: "2024-02-01" },
        0,
      ),
    ).toContain("早于");
  });

  it("非对象失败", () => {
    expect(validateImportItem("str", 0)).toContain("对象");
  });
});

describe("previewImportErrors", () => {
  it("逐条收集错误", () => {
    const parsed = parseImportJson(
      JSON.stringify({
        schemaVersion: 1,
        plans: [
          { title: "ok", start_date: "2024-01-01", end_date: "2024-01-02" },
          { title: "", start_date: "2024-01-01", end_date: "2024-01-02" },
        ],
      }),
    );
    const errors = previewImportErrors(parsed);
    expect(errors).toHaveLength(1);
    expect(errors[0].index).toBe(1);
  });
});

describe("buildExportJson", () => {
  it("含 schemaVersion 且可往返解析", () => {
    const plans: Plan[] = [
      {
        id: "1",
        title: "计划",
        description: "",
        start_date: "2024-01-01",
        end_date: "2024-01-10",
        tags: ["a"],
        archived: false,
        created_at: "x",
        updated_at: "y",
      },
    ];
    const json = buildExportJson(plans, "2024-01-01T00:00:00Z");
    const parsed = parseImportJson(json);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.plans).toHaveLength(1);
  });
});
