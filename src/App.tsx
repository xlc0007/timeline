import { useEffect, useState } from "react";
import { useStore } from "./store/useStore";
import { todayLocal } from "./lib/date";
import type { ThemeMode } from "./lib/types";
import { Timeline } from "./components/Timeline";
import { FilterBar } from "./components/FilterBar";
import { AddEditModal } from "./components/AddEditModal";
import { DetailDrawer } from "./components/DetailDrawer";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ImportExportDialog } from "./components/ImportExportDialog";

export default function App() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const setToday = useStore((s) => s.setToday);
  const load = useStore((s) => s.load);
  const error = useStore((s) => s.error);
  const startCreate = useStore((s) => s.startCreate);

  const [ioOpen, setIoOpen] = useState(false);

  // 主题应用
  useEffect(() => {
    const apply = () => {
      const isDark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
    };
    apply();
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  // 启动加载 + 前台刷新 + 跨午夜刷新
  useEffect(() => {
    const refresh = () => {
      setToday(todayLocal());
      load();
    };
    refresh();

    window.addEventListener("focus", refresh);

    let timer: number;
    const scheduleMidnight = () => {
      const now = new Date();
      const next = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1,
        0,
      );
      timer = window.setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, next.getTime() - now.getTime());
    };
    scheduleMidnight();

    return () => {
      window.removeEventListener("focus", refresh);
      clearTimeout(timer);
    };
  }, [load, setToday]);

  return (
    <div className="app">
      <div className="header">
        <span className="title">时光线条</span>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
          未来计划时间轴
        </span>
        <div className="spacer" />
        <button className="btn primary" onClick={startCreate}>
          ＋ 新增计划
        </button>
        <button className="btn" onClick={() => setIoOpen(true)}>
          导入 / 导出
        </button>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeMode)}
          style={{
            padding: "6px 8px",
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--bg-panel)",
            color: "var(--text)",
          }}
        >
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="system">跟随系统</option>
        </select>
      </div>

      <FilterBar />

      {error && (
        <div className="form-error" style={{ padding: "4px 16px" }}>
          加载失败：{error}
        </div>
      )}

      <Timeline />

      <DetailDrawer />
      <AddEditModal />
      <ConfirmDialog />
      <ImportExportDialog open={ioOpen} onClose={() => setIoOpen(false)} />
    </div>
  );
}
