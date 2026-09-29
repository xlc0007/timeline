import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  addYears,
  dateToJdn,
  daysBetween,
  daysInMonth,
  durationDays,
  fromJdn,
  isLeapYear,
  isValidDate,
  jdnToDate,
  parseDate,
  toJdn,
} from "./date";

describe("闰年", () => {
  it("识别闰年", () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2100)).toBe(false);
    expect(isLeapYear(2023)).toBe(false);
  });

  it("2 月天数随闰年变化", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
  });
});

describe("日期合法性（月末/跨年/闰年）", () => {
  it("校验月末边界", () => {
    expect(isValidDate("2024-01-31")).toBe(true);
    expect(isValidDate("2024-04-30")).toBe(true);
    expect(isValidDate("2024-04-31")).toBe(false); // 4 月无 31 日
    expect(isValidDate("2024-12-31")).toBe(true);
    expect(isValidDate("2024-12-32")).toBe(false);
  });

  it("校验闰年 2 月", () => {
    expect(isValidDate("2024-02-29")).toBe(true);
    expect(isValidDate("2023-02-29")).toBe(false);
  });

  it("校验格式", () => {
    expect(isValidDate("2024-02-01")).toBe(true);
    expect(isValidDate("2024-2-1")).toBe(false);
    expect(isValidDate("20240201")).toBe(false);
    expect(isValidDate("2024/02/01")).toBe(false);
    expect(isValidDate("")).toBe(false);
    expect(isValidDate("2024-13-01")).toBe(false);
    expect(isValidDate("2024-00-10")).toBe(false);
  });
});

describe("JDN 往返与持续天数", () => {
  it("往返一致", () => {
    for (const s of ["2024-01-01", "2024-02-29", "1900-03-01", "9999-12-31"]) {
      expect(jdnToDate(dateToJdn(s))).toBe(s);
    }
  });

  it("known JDN", () => {
    expect(toJdn(2000, 1, 1)).toBe(2451545);
    expect(fromJdn(2451545)).toEqual({ y: 2000, m: 1, d: 1 });
  });

  it("包含持续天数", () => {
    expect(durationDays("2024-01-01", "2024-01-01")).toBe(1);
    expect(durationDays("2024-01-01", "2024-01-10")).toBe(10);
    expect(durationDays("2024-01-01", "2024-12-31")).toBe(366); // 2024 闰年
    expect(durationDays("2023-01-01", "2023-12-31")).toBe(365);
  });

  it("跨年/闰年天数差", () => {
    expect(daysBetween("2024-01-01", "2025-01-01")).toBe(366);
    expect(daysBetween("2023-01-01", "2024-01-01")).toBe(365);
  });

  it("月末跨年", () => {
    expect(daysBetween("2024-12-31", "2025-01-01")).toBe(1);
  });
});

describe("日期加减", () => {
  it("加天数跨月/跨年", () => {
    expect(addDays("2024-01-31", 1)).toBe("2024-02-01");
    expect(addDays("2024-12-31", 1)).toBe("2025-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("加月数月末钳制", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29"); // 闰年 2 月
    expect(addMonths("2023-01-31", 1)).toBe("2023-02-28");
    expect(addMonths("2024-12-15", 1)).toBe("2025-01-15");
    expect(addMonths("2024-03-31", -1)).toBe("2024-02-29");
  });

  it("加年数闰日钳制", () => {
    expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
    expect(addYears("2024-02-29", 4)).toBe("2028-02-29");
    expect(addYears("2023-01-01", 1)).toBe("2024-01-01");
  });
});

describe("parseDate", () => {
  it("解析", () => {
    expect(parseDate("2024-01-05")).toEqual({ y: 2024, m: 1, d: 5 });
  });
});
