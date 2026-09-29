import { useMemo } from "react";
import { useStore } from "../store/useStore";
import { collectTags } from "../lib/filter";
import { CATEGORIES } from "../lib/classify";
import type { Category, PlanStatus } from "../lib/types";

const STATUS_OPTIONS: { value: "all" | PlanStatus; label: string }[] = [
  { value: "all", label: "全部状态" },
  { value: "future", label: "未来" },
  { value: "ongoing", label: "进行中" },
  { value: "ended", label: "已结束" },
  { value: "archived", label: "已归档" },
];

export function FilterBar() {
  const plans = useStore((s) => s.plans);
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const resetFilter = useStore((s) => s.resetFilter);

  const tags = useMemo(() => collectTags(plans), [plans]);

  const toggleCategory = (c: Category) => {
    const cur = filter.categories;
    const next = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c];
    setFilter({ categories: next });
  };

  return (
    <div className="filterbar">
      <input
        type="search"
        placeholder="搜索标题 / 描述…"
        value={filter.keyword}
        onChange={(e) => setFilter({ keyword: e.target.value })}
      />

      <select
        value={filter.status}
        onChange={(e) => setFilter({ status: e.target.value as "all" | PlanStatus })}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <div className="group" style={{ display: "flex", gap: 4 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`btn ${filter.categories.includes(c.key) ? "active" : ""}`}
            onClick={() => toggleCategory(c.key)}
            title={c.label}
          >
            <span
              className="cat-dot"
              style={{ background: c.color, marginRight: 4 }}
            />
            {c.label}
          </button>
        ))}
      </div>

      {tags.length > 0 && (
        <select
          value={filter.tags[0] ?? ""}
          onChange={(e) => setFilter({ tags: e.target.value ? [e.target.value] : [] })}
        >
          <option value="">全部标签</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}

      <button className="btn" onClick={resetFilter}>
        重置
      </button>
    </div>
  );
}
