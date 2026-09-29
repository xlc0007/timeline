// 重叠计划自动分轨：按开始日期排序 + 贪心区间分配，保证互不遮挡。
// 区间为 [startJdn, endJdn]（含端点），复用条件为前轨最后结束日 < 当前开始日。

export interface LaneItem {
  id: string;
  start: number; // JDN
  end: number; // JDN
}

/** 返回每个 item.id 分配到的轨道号（从 0 开始）。 */
export function assignLanes(items: LaneItem[]): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds: number[] = [];
  const result = new Map<string, number>();

  for (const item of sorted) {
    let lane = -1;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] < item.start) {
        lane = i;
        break;
      }
    }
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    result.set(item.id, lane);
  }

  return result;
}
