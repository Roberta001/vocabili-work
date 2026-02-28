/**
 * 时间和期数的计算真的挺复杂的。
 * API返回的日期是刊物的开始时间。
 */

import { DateTime } from "luxon";
import { type BasicSection } from "./board";

/**
 * 计算一个时间之前截止的那一期。
 * @param date 一个时间。默认现在。
 * @return 包括各种刊物的期数
 */
export function issueBefore(date?: DateTime) {
  const now = date || DateTime.local();
  return {
    daily: Math.floor(
      now.diff(DateTime.local(2024, 7, 3), "days").toObject().days!,
    ),
    weekly: Math.floor(
      now.diff(DateTime.local(2024, 8, 31), "weeks").toObject().weeks!,
    ),
    monthly: Math.floor(
      now.diff(DateTime.local(2024, 7, 1), "months").toObject().months!,
    ),
  };
}

/**
 * 计算一个时间之后截止的那一期。
 * @param date 一个时间。默认现在。
 * @return 包括各种刊物的期数
 */
export function issueNow(date?: DateTime) {
  const now = date || DateTime.local();
  const last = issueBefore(now);
  return {
    daily: last.daily + 1,
    weekly: last.weekly + 1,
    monthly: last.monthly + 1,
  };
}

/**
 *  获取 issue 对应的开始时间
 */
export function startTimeOf(issue: number, section: BasicSection) {
  if (section === "daily") {
    return DateTime.local(2024, 7, 2).plus({ days: issue });
  } else if (section === "weekly") {
    return DateTime.local(2024, 8, 24).plus({ weeks: issue });
  } else {
    return DateTime.local(2024, 6, 1).plus({ months: issue });
  }
}

/**
 *  获取 issue 对应的结束时间。
 *  也就是下一个 issue 的开始时间。中间不设空隙。
 */
export function endTimeOf(issue: number, section: BasicSection) {
  if (section === "daily") {
    return DateTime.local(2024, 7, 3).plus({ days: issue });
  } else if (section === "weekly") {
    return DateTime.local(2024, 8, 31).plus({ weeks: issue });
  } else {
    return DateTime.local(2024, 7, 1).plus({ months: issue });
  }
}

/**
 *
 * @param dateStr ISO 8601 格式 UTC
 * @returns
 */
export function formatTime(dateStr: string) {
  // 假设 dateStr 是 UTC 时间格式，例如 "2025-06-25 10:14:00"
  const d = DateTime.fromISO(dateStr, { zone: "utc" }); // 解析为 UTC 时间
  const local = d.setZone(DateTime.local().zoneName); // 转换为本地时间
  return local.toFormat("yyyy-MM-dd HH:mm:ss");
}
