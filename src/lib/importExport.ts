// JSON 导入导出：schemaVersion 校验与序列化（与 Rust 侧规则对齐）。
// 前端此处用于即时校验与测试；真正的持久化导入由 Rust 命令执行。

import type { ImportError, ImportReport, Plan } from "./types";
import { isValidDate } from "./date";

export const SCHEMA_VERSION = 1;

export interface ParsedImport {
  schemaVersion: number;
  exportedAt: string;
  plans: unknown[];
}

/** 解析并做顶层结构校验；不合法时抛出 Error。 */
export function parseImportJson(json: string): ParsedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new Error(`JSON 解析失败：${(e as Error).message}`);
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("根节点必须是对象");
  }
  const obj = raw as Record<string, unknown>;
  const schemaVersion = obj.schemaVersion;
  if (typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion)) {
    throw new Error("缺少有效的 schemaVersion 字段");
  }
  if (schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `不支持的 schemaVersion：${schemaVersion}（当前支持 ${SCHEMA_VERSION}）`,
    );
  }
  if (!Array.isArray(obj.plans)) {
    throw new Error("缺少 plans 数组");
  }
  return {
    schemaVersion,
    exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt : "",
    plans: obj.plans,
  };
}

/** 校验单条导入项，返回原因（空串表示通过）。与 Rust 侧规则一致。 */
export function validateImportItem(item: unknown, index: number): string {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return `第 ${index + 1} 条：计划项必须是对象`;
  }
  const o = item as Record<string, unknown>;

  if (typeof o.title !== "string" || o.title.trim() === "") {
    return `第 ${index + 1} 条：标题不能为空`;
  }
  const start = o.start_date;
  const end = o.end_date;
  if (typeof start !== "string" || !isValidDate(start)) {
    return `第 ${index + 1} 条：start_date 缺失或格式非法`;
  }
  if (typeof end !== "string" || !isValidDate(end)) {
    return `第 ${index + 1} 条：end_date 缺失或格式非法`;
  }
  if (end < start) {
    return `第 ${index + 1} 条：结束日期不得早于开始日期`;
  }
  return "";
}

/** 前端预校验：返回逐条错误列表（不回写数据库）。 */
export function previewImportErrors(parsed: ParsedImport): ImportError[] {
  const errors: ImportError[] = [];
  parsed.plans.forEach((item, index) => {
    const reason = validateImportItem(item, index);
    if (reason) errors.push({ index, reason });
  });
  return errors;
}

/** 构建导出 JSON 字符串（Rust 侧导出的权威版本；此处用于测试与降级）。 */
export function buildExportJson(plans: Plan[], exportedAt: string): string {
  return JSON.stringify(
    { schemaVersion: SCHEMA_VERSION, exportedAt, plans },
    null,
    2,
  );
}

/** 从 import 命令的结果生成本地化摘要文本。 */
export function summarizeImportReport(report: ImportReport): string {
  const lines = [`成功导入 ${report.imported} 条，失败 ${report.failed} 条。`];
  for (const e of report.errors) {
    lines.push(`· 第 ${e.index + 1} 条：${e.reason}`);
  }
  return lines.join("\n");
}
