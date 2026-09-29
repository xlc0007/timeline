import type { Category, Plan, PlanStatus } from "./types";
import { categoryOf } from "./classify";
import { compareDates } from "./date";

export interface FilterState {
  keyword: string;
  tags: string[]; // 选中的标签（空 = 全部）
  categories: Category[]; // 选中的分类（空 = 全部）
  status: "all" | PlanStatus;
}

export function statusOf(plan: Plan, today: string): PlanStatus {
  if (plan.archived) return "archived";
  if (compareDates(plan.end_date, today) < 0) return "ended";
  if (compareDates(plan.start_date, today) > 0) return "future";
  return "ongoing";
}

export function matchesKeyword(plan: Plan, keyword: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (!k) return true;
  return (
    plan.title.toLowerCase().includes(k) ||
    plan.description.toLowerCase().includes(k)
  );
}

export function matchesTags(plan: Plan, tags: string[]): boolean {
  if (tags.length === 0) return true;
  return tags.some((t) => plan.tags.includes(t));
}

export function filterPlans(
  plans: Plan[],
  filter: FilterState,
  today: string,
): Plan[] {
  return plans.filter((p) => {
    if (!matchesKeyword(p, filter.keyword)) return false;
    if (!matchesTags(p, filter.tags)) return false;
    if (
      filter.categories.length > 0 &&
      !filter.categories.includes(categoryOf(p.start_date, p.end_date))
    ) {
      return false;
    }
    if (filter.status !== "all" && statusOf(p, today) !== filter.status) {
      return false;
    }
    return true;
  });
}

/** 收集所有计划出现过的标签（去重排序），供筛选器使用。 */
export function collectTags(plans: Plan[]): string[] {
  const set = new Set<string>();
  for (const p of plans) {
    for (const t of p.tags) set.add(t);
  }
  return Array.from(set).sort();
}
