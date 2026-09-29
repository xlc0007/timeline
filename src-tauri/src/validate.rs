//! 日期与字段校验（Rust 侧权威实现）。
//!
//! 日期一律为 `YYYY-MM-DD` 纯字符串，比较直接用字典序（格式固定零填充，
//! 字典序等价于时间序），不经过任何 UTC / 时区转换，杜绝日期偏移。

use crate::models::PlanInput;

/// 判断是否为合法闰年。
pub fn is_leap_year(y: i32) -> bool {
    (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0)
}

/// 某年某月的天数。
pub fn days_in_month(y: i32, m: u32) -> u32 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap_year(y) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

/// 校验 `YYYY-MM-DD` 格式且为真实存在的日期（含闰年、月末）。
pub fn is_valid_date(s: &str) -> bool {
    let bytes = s.as_bytes();
    if bytes.len() != 10 {
        return false;
    }
    if bytes[4] != b'-' || bytes[7] != b'-' {
        return false;
    }
    let year: i32 = match s[0..4].parse() {
        Ok(v) => v,
        Err(_) => return false,
    };
    let month: u32 = match s[5..7].parse() {
        Ok(v) => v,
        Err(_) => return false,
    };
    let day: u32 = match s[8..10].parse() {
        Ok(v) => v,
        Err(_) => return false,
    };
    if !(1..=12).contains(&month) {
        return false;
    }
    if year < 1 || year > 9999 {
        return false;
    }
    let dim = days_in_month(year, month);
    (1..=dim).contains(&day)
}

/// 校验起止日期合法且 `end >= start`（包含关系，结束不得早于开始）。
pub fn validate_range(start: &str, end: &str) -> Result<(), String> {
    if !is_valid_date(start) {
        return Err(format!("开始日期格式非法：{start}"));
    }
    if !is_valid_date(end) {
        return Err(format!("结束日期格式非法：{end}"));
    }
    if end < start {
        return Err(format!("结束日期不得早于开始日期（{end} < {start}）"));
    }
    Ok(())
}

/// 新建计划额外约束：开始日期不得早于今天（本地日期字符串）。
pub fn validate_start_not_before_today(start: &str, today: &str) -> Result<(), String> {
    if start < today {
        return Err(format!("开始日期不得早于今天（{start} < {today}）"));
    }
    Ok(())
}

/// 校验新建计划的完整字段（标题非空、日期范围、不得早于今天）。
pub fn validate_new_plan(input: &PlanInput, today: &str) -> Result<(), String> {
    validate_common(input)?;
    validate_start_not_before_today(&input.start_date, today)
}

/// 校验编辑计划的完整字段（标题非空、日期范围；不强制 start >= today）。
pub fn validate_edit_plan(input: &PlanInput) -> Result<(), String> {
    validate_common(input)
}

fn validate_common(input: &PlanInput) -> Result<(), String> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err("标题不能为空".to_string());
    }
    validate_range(&input.start_date, &input.end_date)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn leap_years() {
        assert!(is_leap_year(2000));
        assert!(is_leap_year(2024));
        assert!(!is_leap_year(1900));
        assert!(!is_leap_year(2023));
    }

    #[test]
    fn month_end_and_leap() {
        assert!(is_valid_date("2024-02-29"));
        assert!(!is_valid_date("2023-02-29"));
        assert!(is_valid_date("2024-12-31"));
        assert!(!is_valid_date("2024-12-32"));
        assert!(!is_valid_date("2024-13-01"));
        assert!(!is_valid_date("2024-00-10"));
        assert!(is_valid_date("2024-04-30"));
        assert!(!is_valid_date("2024-04-31"));
    }

    #[test]
    fn format_checks() {
        assert!(!is_valid_date("2024/02/01"));
        assert!(!is_valid_date("2024-2-1"));
        assert!(!is_valid_date("20240201"));
        assert!(!is_valid_date(""));
    }

    #[test]
    fn range_end_not_before_start() {
        assert!(validate_range("2024-01-01", "2024-01-01").is_ok());
        assert!(validate_range("2024-01-01", "2024-12-31").is_ok());
        assert!(validate_range("2024-12-31", "2024-01-01").is_err());
    }

    #[test]
    fn new_not_before_today() {
        assert!(validate_start_not_before_today("2024-01-02", "2024-01-01").is_ok());
        assert!(validate_start_not_before_today("2024-01-01", "2024-01-01").is_ok());
        assert!(validate_start_not_before_today("2023-12-31", "2024-01-01").is_err());
    }

    #[test]
    fn new_plan_full_validation() {
        let today = "2024-06-15";
        let ok = PlanInput {
            title: "计划".to_string(),
            description: String::new(),
            start_date: "2024-06-20".to_string(),
            end_date: "2024-07-20".to_string(),
            tags: vec![],
        };
        assert!(validate_new_plan(&ok, today).is_ok());

        let past = PlanInput {
            start_date: "2024-06-10".to_string(),
            ..ok.clone()
        };
        assert!(validate_new_plan(&past, today).is_err());

        let empty_title = PlanInput {
            title: "   ".to_string(),
            ..ok.clone()
        };
        assert!(validate_new_plan(&empty_title, today).is_err());
    }
}
