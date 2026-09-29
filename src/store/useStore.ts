import { create } from "zustand";
import type {
  Category,
  ImportReport,
  Plan,
  PlanInput,
  PlanStatus,
  ThemeMode,
  ViewMode,
} from "../lib/types";
import { api } from "../lib/api";
import { todayLocal } from "../lib/date";
import type { FilterState } from "../lib/filter";

const THEME_KEY = "shiguang.theme";

function readTheme(): ThemeMode {
  const v = localStorage.getItem(THEME_KEY);
  if (v === "dark" || v === "system" || v === "light") return v;
  return "light";
}

export const emptyFilter: FilterState = {
  keyword: "",
  tags: [],
  categories: [],
  status: "all",
};

interface AppState {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  today: string;
  filter: FilterState;
  viewMode: ViewMode;
  zoom: number;
  anchorDate: string;
  theme: ThemeMode;

  detailId: string | null;
  /** null = 关闭；"new" = 新增；Plan = 编辑 */
  editing: Plan | "new" | null;
  confirmDelete: Plan | null;
  importReport: ImportReport | null;

  load: () => Promise<void>;
  createPlan: (input: PlanInput) => Promise<void>;
  updatePlan: (id: string, input: PlanInput) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  setFilter: (f: Partial<FilterState>) => void;
  resetFilter: () => void;
  setViewMode: (v: ViewMode) => void;
  setZoom: (z: number) => void;
  setAnchorDate: (d: string) => void;
  setTheme: (t: ThemeMode) => void;
  setToday: (t: string) => void;

  openDetail: (id: string) => void;
  closeDetail: () => void;
  startCreate: () => void;
  startEdit: (p: Plan) => void;
  cancelEdit: () => void;
  askDelete: (p: Plan) => void;
  cancelDelete: () => void;
  setImportReport: (r: ImportReport | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  plans: [],
  loading: false,
  error: null,
  today: todayLocal(),
  filter: { ...emptyFilter },
  viewMode: "month",
  zoom: 1,
  anchorDate: todayLocal(),
  theme: readTheme(),

  detailId: null,
  editing: null,
  confirmDelete: null,
  importReport: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const plans = await api.list();
      set({ plans, loading: false });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  createPlan: async (input) => {
    await api.create(input);
    await get().load();
  },

  updatePlan: async (id, input) => {
    await api.update(id, input);
    await get().load();
  },

  deletePlan: async (id) => {
    await api.remove(id);
    set({ confirmDelete: null, detailId: get().detailId === id ? null : get().detailId });
    await get().load();
  },

  toggleArchive: async (id) => {
    const p = get().plans.find((x) => x.id === id);
    if (!p) return;
    await api.setArchived(id, !p.archived);
    await get().load();
  },

  setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f } })),
  resetFilter: () => set({ filter: { ...emptyFilter } }),

  setViewMode: (v) => set({ viewMode: v, zoom: 1, anchorDate: todayLocal() }),
  setZoom: (z) => set({ zoom: Math.min(4, Math.max(0.5, z)) }),
  setAnchorDate: (d) => set({ anchorDate: d }),
  setTheme: (t) => {
    localStorage.setItem(THEME_KEY, t);
    set({ theme: t });
  },
  setToday: (t) => set({ today: t }),

  openDetail: (id) => set({ detailId: id }),
  closeDetail: () => set({ detailId: null }),
  startCreate: () => set({ editing: "new" }),
  startEdit: (p) => set({ editing: p }),
  cancelEdit: () => set({ editing: null }),
  askDelete: (p) => set({ confirmDelete: p }),
  cancelDelete: () => set({ confirmDelete: null }),
  setImportReport: (r) => set({ importReport: r }),
}));

export type { Category, Plan, PlanStatus };
