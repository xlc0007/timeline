import { useRef, useState } from "react";
import { api } from "../lib/api";
import {
  parseImportJson,
  previewImportErrors,
  summarizeImportReport,
} from "../lib/importExport";
import type { ImportReport } from "../lib/types";
import { useStore } from "../store/useStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportExportDialog({ open, onClose }: Props) {
  const load = useStore((s) => s.load);
  const [exported, setExported] = useState("");
  const [exportMsg, setExportMsg] = useState("");

  const [importText, setImportText] = useState("");
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [importError, setImportError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const doExport = async () => {
    try {
      const json = await api.exportJson();
      setExported(json);
      setExportMsg("");
    } catch (e) {
      setExportMsg(`导出失败：${e}`);
    }
  };

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exported);
      setExportMsg("已复制到剪贴板");
    } catch {
      setExportMsg("复制失败，请手动选择文本");
    }
  };

  const onPickFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    setImportText(text);
    setReport(null);
    setImportError("");
    try {
      const parsed = parseImportJson(text);
      setPreviewErrors(previewImportErrors(parsed).map((e) => `第 ${e.index + 1} 条：${e.reason}`));
    } catch (e) {
      setPreviewErrors([String(e)]);
    }
  };

  const doImport = async () => {
    if (!importText) return;
    setBusy(true);
    setImportError("");
    try {
      const r = await api.importJson(importText);
      setReport(r);
      await load();
    } catch (e) {
      setImportError(`导入失败：${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">导入 / 导出</div>
        <div className="modal-body">
          <div className="field">
            <div className="k">导出</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={doExport}>
                生成导出数据
              </button>
              {exported && (
                <>
                  <button
                    className="btn primary"
                    onClick={() =>
                      download(
                        `时光线条导出-${new Date()
                          .toISOString()
                          .slice(0, 10)
                          .replace(/-/g, "")}.json`,
                        exported,
                      )
                    }
                  >
                    下载 JSON 文件
                  </button>
                  <button className="btn" onClick={copyExport}>
                    复制
                  </button>
                </>
              )}
            </div>
            {exportMsg && <div className="form-error">{exportMsg}</div>}
            {exported && (
              <textarea
                readOnly
                value={exported}
                style={{ width: "100%", minHeight: 120, marginTop: 8 }}
              />
            )}
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <div className="k">导入</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => fileRef.current?.click()}>
                选择 JSON 文件
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
              {importText && (
                <button className="btn primary" onClick={doImport} disabled={busy}>
                  {busy ? "导入中…" : "确认导入"}
                </button>
              )}
            </div>
            {previewErrors.length > 0 && (
              <div className="report" style={{ marginTop: 8 }}>
                <div>预校验发现 {previewErrors.length} 个问题：</div>
                {previewErrors.map((e, i) => (
                  <div className="err" key={i}>
                    {e}
                  </div>
                ))}
              </div>
            )}
            {report && (
              <div className="report" style={{ marginTop: 8 }}>
                {summarizeImportReport(report)
                  .split("\n")
                  .map((line, i) => (
                    <div key={i} className={line.startsWith("·") ? "err" : ""}>
                      {line}
                    </div>
                  ))}
              </div>
            )}
            {importError && <div className="form-error">{importError}</div>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
