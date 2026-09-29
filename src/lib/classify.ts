import type { Category } from "./types";
import { durationDays } from "./date";

/** 按持续天数分类：<30 短期；30–180（含边界）中期；>180 长期。 */
export function classify(days: number): Category {
  if (days < 30) return "short";
  if (days <= 180) return "medium";
  return "long";
}

export function categoryOf(start: string, end: string): Category {
  return classify(durationDays(start, end));
}

export interface CategoryMeta {
  key: Category;
  label: string;
  color: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: "short", label: "短期", color: "#2563eb" },
  { key: "medium", label: "中期", color: "#f59e0b" },
  { key: "long", label: "长期", color: "#8b5cf6" },
];

export const CATEGORY_MAP: Record<Category, CategoryMeta> = {
  short: CATEGORIES[0],
  medium: CATEGORIES[1],
  long: CATEGORIES[2],
};
