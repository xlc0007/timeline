import { useStore } from "../store/useStore";
import { categoryOf, CATEGORY_MAP } from "../lib/classify";
import { durationDays, formatDisplay } from "../lib/date";

function fmtTs(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("zh-CN", { hour12: false });
}

export function DetailDrawer() {
  const detailId = useStore((s) => s.detailId);
  const plans = useStore((s) => s.plans);
  const closeDetail = useStore((s) => s.closeDetail);
  const startEdit = useStore((s) => s.startEdit);
  const askDelete = useStore((s) => s.askDelete);
  const toggleArchive = useStore((s) => s.toggleArchive);

  const plan = plans.find((p) => p.id === detailId);
  if (!plan) return null;

  const days = durationDays(plan.start_date, plan.end_date);
  const meta = CATEGORY_MAP[categoryOf(plan.start_date, plan.end_date)];

  return (
    <>
      <div className="drawer-mask" onClick={closeDetail} />
      <div className="drawer">
        <div className="drawer-header">
          <span className="t">{plan.title}</span>
          <button className="btn icon" onClick={closeDetail} title="关闭">
            ✕
          </button>
        </div>
        <div className="drawer-body">
          <div className="field">
            <div className="k">开始日期</div>
            <div className="v">{formatDisplay(plan.start_date)}</div>
          </div>
          <div className="field">
            <div className="k">结束日期</div>
            <div className="v">{formatDisplay(plan.end_date)}</div>
          </div>
          <div className="field">
            <div className="k">持续天数</div>
            <div className="v">{days} 天</div>
          </div>
          <div className="field">
            <div className="k">分类</div>
            <div className="v">
              <span className="cat-badge">
                <span className="cat-dot" style={{ background: meta.color }} />
                {meta.label}
              </span>
            </div>
          </div>
          <div className="field">
            <div className="k">描述</div>
            <div className="v" style={{ whiteSpace: "pre-wrap" }}>
              {plan.description || "—"}
            </div>
          </div>
          <div className="field">
            <div className="k">标签</div>
            <div className="v">
              {plan.tags.length
                ? plan.tags.map((t) => (
                    <span className="tag-chip" key={t}>
                      {t}
                    </span>
                  ))
                : "—"}
            </div>
          </div>
          <div className="field">
            <div className="k">状态</div>
            <div className="v">{plan.archived ? "已归档" : "未归档"}</div>
          </div>
          <div className="field">
            <div className="k">创建时间</div>
            <div className="v">{fmtTs(plan.created_at)}</div>
          </div>
          <div className="field">
            <div className="k">更新时间</div>
            <div className="v">{fmtTs(plan.updated_at)}</div>
          </div>
        </div>
        <div className="drawer-footer">
          <button className="btn" onClick={() => toggleArchive(plan.id)}>
            {plan.archived ? "取消归档" : "归档"}
          </button>
          <button
            className="btn"
            onClick={() => {
              closeDetail();
              startEdit(plan);
            }}
          >
            编辑
          </button>
          <button className="btn danger" onClick={() => askDelete(plan)}>
            删除
          </button>
        </div>
      </div>
    </>
  );
}
