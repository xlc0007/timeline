// 共享类型定义

export interface Plan {
  id: string;
  title: string;
  description: string;
  /** ISO 日期字符串 YYYY-MM-DD（仅日期，无时间） */
  start_date: string;
  end_date: string;
  tags: string[];
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanInput {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  tags: string[];
}

export type Category = "short" | "medium" | "long";
export type PlanStatus = "future" | "ongoing" | "ended" | "archived";
export type ViewMode = "day" | "week" | "month" | "year";
export type ThemeMode = "light" | "dark" | "system";

export interface ImportError {
  index: number;
  reason: string;
}

export interface ImportReport {
  imported: number;
  failed: number;
  errors: ImportError[];
}
