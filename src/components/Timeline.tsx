import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store/useStore";
import { filterPlans } from "../lib/filter";
import { assignLanes } from "../lib/lane";
import { categoryOf } from "../lib/classify";
import { addDays, dateToJdn, daysBetween } from "../lib/date";
import type { Plan, ViewMode } from "../lib/types";
import { PlanBar } from "./PlanBar";

const BASE_PX: Record<ViewMode, number> = {
  day: 48,
  week: 14,
  month: 4,
  year: 1.2,
};

const ROW_H = 34;
const BAR_H = 24;

interface Tick {
  date: string;
  label: string;
  major: boolean;
}

function dayOfWeek(jdn: number): number {
  return ((jdn % 7) + 7) % 7; // 0 = 周一
}

function fmtMD(s: string): string {
  const [, m, d] = s.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 生成从 anchor 开始的刻度，覆盖 visibleDays 天。 */
function buildTicks(view: ViewMode, anchor: string, visibleDays: number): Tick[] {
  const ticks: Tick[] = [];
  const anchorJdn = dateToJdn(anchor);
  const endJdn = anchorJdn + visibleDays;
  let jdn = anchorJdn;
  let prevMonth = -1;

  while (jdn <= endJdn) {
    const date = jdnToDateLocal(jdn);
    const [, m, d] = date.split("-").map(Number);
    const y = Number(date.slice(0, 4));
    let major = false;

    if (view === "day") {
      major = d === 1;
      jdn += 1;
    } else if (view === "week") {
      const ws = jdn - dayOfWeek(jdn);
      const wdate = jdnToDateLocal(ws);
      ticks.push({ date: wdate, label: fmtMD(wdate), major: false });
      jdn = ws + 7;
      continue;
    } else if (view === "month") {
      major = true;
      const mo = `${y}年${m}月`;
      ticks.push({ date, label: mo, major });
      const ny = m === 12 ? y + 1 : y;
      const nm = m === 12 ? 1 : m + 1;
      jdn = dateToJdn(`${ny}-${String(nm).padStart(2, "0")}-01`);
      continue;
    } else {
      // year
      major = true;
      ticks.push({ date, label: `${y}年`, major });
      jdn = dateToJdn(`${y + 1}-01-01`);
      continue;
    }

    const monthChanged = m !== prevMonth;
    if (view === "day") {
      ticks.push({ date, label: monthChanged ? `${m}月${d}日` : `${d}`, major });
    }
    prevMonth = m;
  }
  return ticks;
}

function jdnToDateLocal(jdn: number): string {
  // 复用 fromJdn 的逆向，这里直接内联以避免循环依赖
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const dd = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * dd) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + dd - 4800 + Math.floor(m / 10);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function Timeline() {
  const plans = useStore((s) => s.plans);
  const filter = useStore((s) => s.filter);
  const today = useStore((s) => s.today);
  const viewMode = useStore((s) => s.viewMode);
  const zoom = useStore((s) => s.zoom);
  const anchorDate = useStore((s) => s.anchorDate);
  const setViewMode = useStore((s) => s.setViewMode);
  const setZoom = useStore((s) => s.setZoom);
  const setAnchorDate = useStore((s) => s.setAnchorDate);
  const openDetail = useStore((s) => s.openDetail);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pxPerDay = BASE_PX[viewMode] * zoom;
  const visibleDays = Math.ceil(width / pxPerDay) + 1;
  const anchorJdn = dateToJdn(anchorDate);

  const filtered = useMemo(
    () => filterPlans(plans, filter, today),
    [plans, filter, today],
  );

  const visiblePlans = useMemo(() => {
    const endJdn = anchorJdn + visibleDays;
    return filtered.filter((p) => {
      return dateToJdn(p.end_date) >= anchorJdn && dateToJdn(p.start_date) <= endJdn;
    });
  }, [filtered, anchorJdn, visibleDays]);

  const lanes = useMemo(
    () =>
      assignLanes(
        visiblePlans.map((p) => ({
          id: p.id,
          start: dateToJdn(p.start_date),
          end: dateToJdn(p.end_date),
        })),
      ),
    [visiblePlans],
  );

  const laneCount = useMemo(() => {
    let max = -1;
    lanes.forEach((v) => (max = Math.max(max, v)));
    return max + 1;
  }, [lanes]);

  const ticks = useMemo(
    () => buildTicks(viewMode, anchorDate, visibleDays),
    [viewMode, anchorDate, visibleDays],
  );

  const todayX = (dateToJdn(today) - anchorJdn) * pxPerDay;
  const bodyHeight = Math.max(laneCount * ROW_H + 16, 200);

  const nav = (dir: 1 | -1) => {
    const step = Math.max(1, Math.round(visibleDays * 0.8));
    setAnchorDate(addDays(anchorDate, dir * step));
  };
  const goToday = () => {
    setAnchorDate(addDays(today, -Math.round(visibleDays / 2)));
  };

  return (
    <div className="timeline-wrap">
      <div className="toolbar">
        <div className="group">
          {(["day", "week", "month", "year"] as ViewMode[]).map((v) => (
            <button
              key={v}
              className={`btn ${viewMode === v ? "active" : ""}`}
              onClick={() => setViewMode(v)}
            >
              {{ day: "日", week: "周", month: "月", year: "年" }[v]}
            </button>
          ))}
        </div>
        <div className="divider" />
        <div className="group">
          <button className="btn icon" onClick={() => setZoom(zoom / 1.25)} title="缩小">
            −
          </button>
          <button className="btn icon" onClick={() => setZoom(zoom * 1.25)} title="放大">
            +
          </button>
        </div>
        <div className="divider" />
        <div className="group">
          <button className="btn icon" onClick={() => nav(-1)} title="后退">
            ←
          </button>
          <button className="btn" onClick={goToday}>
            今天
          </button>
          <button className="btn icon" onClick={() => nav(1)} title="前进">
            →
          </button>
        </div>
        <div className="spacer" style={{ flex: 1 }} />
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
          {filtered.length} 项
        </span>
      </div>

      <div className="timeline-scroll" ref={scrollRef}>
        <div className="timeline-canvas">
          <div className="timeline-header" style={{ position: "sticky", top: 0 }}>
            {ticks.map((t, i) => {
              const x = daysBetween(anchorDate, t.date) * pxPerDay;
              return (
                <div
                  key={i}
                  className={`tick ${t.major ? "major" : ""}`}
                  style={{ left: x }}
                >
                  <div className="line" />
                  <div className="label">{t.label}</div>
                </div>
              );
            })}
          </div>
          <div className="timeline-body" style={{ height: bodyHeight }}>
            {ticks.map((t, i) => {
              const x = daysBetween(anchorDate, t.date) * pxPerDay;
              return (
                <div
                  key={`g${i}`}
                  className={`gridline ${t.major ? "major" : ""}`}
                  style={{ left: x }}
                />
              );
            })}

            {visiblePlans.map((p: Plan) => {
              const lane = lanes.get(p.id) ?? 0;
              const left = daysBetween(anchorDate, p.start_date) * pxPerDay;
              const w = Math.max(
                daysBetween(p.start_date, p.end_date) * pxPerDay + pxPerDay,
                pxPerDay,
              );
              return (
                <PlanBar
                  key={p.id}
                  plan={p}
                  left={left}
                  width={w}
                  top={lane * ROW_H + 6}
                  height={BAR_H}
                  color={categoryOf(p.start_date, p.end_date)}
                  onOpen={() => openDetail(p.id)}
                />
              );
            })}

            {todayX >= 0 && todayX <= visibleDays * pxPerDay && (
              <div className="today-line" style={{ left: todayX }}>
                <div className="today-label">今天</div>
              </div>
            )}
          </div>
        </div>
        {visiblePlans.length === 0 && (
          <div className="empty" style={{ position: "absolute", inset: 0 }}>
            暂无匹配的计划
          </div>
        )}
      </div>
    </div>
  );
}
