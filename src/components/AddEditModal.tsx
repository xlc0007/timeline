import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { isValidDate } from "../lib/date";

export function AddEditModal() {
  const editing = useStore((s) => s.editing);
  const today = useStore((s) => s.today);
  const cancelEdit = useStore((s) => s.cancelEdit);
  const createPlan = useStore((s) => s.createPlan);
  const updatePlan = useStore((s) => s.updatePlan);

  const isEdit = editing !== null && editing !== "new";
  const plan = editing !== null && editing !== "new" ? editing : null;

  const [title, setTitle] = useState(plan?.title ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [start, setStart] = useState(plan?.start_date ?? today);
  const [end, setEnd] = useState(plan?.end_date ?? today);
  const [tagsText, setTagsText] = useState(plan?.tags.join("，") ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // 打开（含切换编辑对象）时重置表单
  useEffect(() => {
    if (editing === null) return;
    const p = editing === "new" ? null : editing;
    setTitle(p?.title ?? "");
    setDescription(p?.description ?? "");
    setStart(p?.start_date ?? today);
    setEnd(p?.end_date ?? today);
    setTagsText(p?.tags.join("，") ?? "");
    setError("");
  }, [editing, today]);

  if (editing === null) return null;

  const submit = async () => {
    const t = title.trim();
    if (!t) return setError("标题不能为空");
    if (!isValidDate(start)) return setError("开始日期格式无效");
    if (!isValidDate(end)) return setError("结束日期格式无效");
    if (end < start) return setError("结束日期不得早于开始日期");
    if (!isEdit && start < today) return setError("开始日期不得早于今天");
    const tags = tagsText
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      setSaving(true);
      const input = {
        title: t,
        description,
        start_date: start,
        end_date: end,
        tags,
      };
      if (isEdit && plan) await updatePlan(plan.id, input);
      else await createPlan(input);
      cancelEdit();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-mask" onClick={cancelEdit}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">{isEdit ? "编辑计划" : "新增计划"}</div>
        <div className="modal-body">
          <div className="form-row">
            <label>标题 *</label>
            <input
              type="text"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              placeholder="计划标题"
            />
          </div>
          <div className="form-row">
            <label>开始日期 *</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="form-row">
            <label>结束日期 *</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="form-row">
            <label>标签（用逗号分隔）</label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="工作，学习"
            />
          </div>
          <div className="form-row">
            <label>描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="补充说明…"
            />
          </div>
          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={cancelEdit}>
            取消
          </button>
          <button className="btn primary" onClick={submit} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
