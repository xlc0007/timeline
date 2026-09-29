// 日期纯函数。所有日期为 `YYYY-MM-DD` 纯字符串，内部用儒略日(JDN)做日历数学，
// 绝不通过 `new Date(dateStr)` 解析，从根上杜绝 UTC/时区导致的日期偏移。

export interface YMD {
  y: number;
  m: number;
  d: number;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  switch (m) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeapYear(y) ? 29 : 28;
    default:
      return 0;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const { y, m, d } = parseDate(s);
  if (y < 1 || y > 9999) return false;
  if (m < 1 || m > 12) return false;
  return d >= 1 && d <= daysInMonth(y, m);
}

export function parseDate(s: string): YMD {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

export function formatYMD(y: number, m: number, d: number): string {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/** 儒略日数（Julian Day Number），用于日期差值与加减。 */
export function toJdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

export function fromJdn(jdn: number): YMD {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { y: year, m: month, d: day };
}

export function dateToJdn(s: string): number {
  const { y, m, d } = parseDate(s);
  return toJdn(y, m, d);
}

export function jdnToDate(jdn: number): string {
  const { y, m, d } = fromJdn(jdn);
  return formatYMD(y, m, d);
}

/** end - start 的间隔天数（不含起点）。 */
export function daysBetween(start: string, end: string): number {
  return dateToJdn(end) - dateToJdn(start);
}

/** 起止均含的持续天数：end - start + 1（>=1）。 */
export function durationDays(start: string, end: string): number {
  return daysBetween(start, end) + 1;
}

/** 字符串字典序即时间序（格式固定零填充）。 */
export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addDays(s: string, n: number): string {
  return jdnToDate(dateToJdn(s) + n);
}

export function addMonths(s: string, n: number): string {
  const { y, m, d } = parseDate(s);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12; // 0..11
  const nd = Math.min(d, daysInMonth(ny, nm + 1));
  return formatYMD(ny, nm + 1, nd);
}

export function addYears(s: string, n: number): string {
  const { y, m, d } = parseDate(s);
  const nd = Math.min(d, daysInMonth(y + n, m));
  return formatYMD(y + n, m, nd);
}

/** 本地今天（读取本地年月日，无 UTC 偏移）。 */
export function todayLocal(): string {
  const now = new Date();
  return formatYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** 本地显示格式，如 `2024年1月5日`。 */
export function formatDisplay(s: string): string {
  const { y, m, d } = parseDate(s);
  return `${y}年${m}月${d}日`;
}
