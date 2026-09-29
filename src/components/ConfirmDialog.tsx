import { useStore } from "../store/useStore";

export function ConfirmDialog() {
  const confirmDelete = useStore((s) => s.confirmDelete);
  const cancelDelete = useStore((s) => s.cancelDelete);
  const deletePlan = useStore((s) => s.deletePlan);

  if (!confirmDelete) return null;

  return (
    <div className="modal-mask" onClick={cancelDelete}>
      <div className="modal" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">删除确认</div>
        <div className="modal-body">
          确定要删除计划「{confirmDelete.title}」吗？此操作不可撤销。
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={cancelDelete}>
            取消
          </button>
          <button className="btn danger" onClick={() => deletePlan(confirmDelete.id)}>
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
