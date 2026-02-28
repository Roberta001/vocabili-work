import * as luxon from "luxon";

type SequentialBoard =
  | "vocaloid-monthly"
  | "vocaloid-weekly"
  | "vocaloid-daily";
type Part = "main" | "new";
export interface BoardIdentity {
  board: SequentialBoard;
  part: Part;
  issue: number;
}

export interface DataIdentity {
  date: luxon.DateTime;
}

export function isBoardIdentity(
  identity: BoardIdentity | DataIdentity,
): identity is BoardIdentity {
  return (identity as BoardIdentity).board !== undefined;
}

export function isDataIdentity(
  identity: BoardIdentity | DataIdentity,
): identity is DataIdentity {
  return (identity as DataIdentity).date !== undefined;
}

/**
 * 输入一个文件名，解析它是什么数据或者榜单文件
 *  */
export function extractFileName(
  filename: string,
): BoardIdentity | DataIdentity {
  filename = filename.replace(/\.xlsx$/, "");
  const hyphen_count = filename.split("-").length - 1;
  let result: BoardIdentity | DataIdentity;
  let dateStr: string;
  if (hyphen_count == 1) {
    result = {
      board: "vocaloid-monthly",
      part: "main",
      issue: 0,
    };
    if (filename.startsWith("新曲")) {
      result.part = "new";
      dateStr = filename.slice(2);
    } else {
      dateStr = filename;
    }
    const issueDate = luxon.DateTime.fromFormat(dateStr, "yyyy-MM");
    result.issue = (issueDate.year - 2024) * 12 + issueDate.month - 6;
  } else if (hyphen_count > 1) {
    result = {
      board: "vocaloid-weekly",
      part: "main",
      issue: 0,
    };
    if (filename.startsWith("新曲")) {
      result.part = "new";
      dateStr = filename.slice(2);
    } else {
      dateStr = filename;
    }
    const issueDate = luxon.DateTime.fromFormat(dateStr, "yyyy-MM-dd");
    result.issue = issueDate.diff(
      luxon.DateTime.fromObject({ year: 2024, month: 8, day: 31 }),
      "weeks",
    ).weeks;
  } else if (filename.indexOf("与") !== -1) {
    result = {
      board: "vocaloid-daily",
      part: "main",
      issue: 0,
    };
    if (filename.startsWith("新曲榜")) {
      result.part = "new";
      dateStr = filename.slice(3).split("与")[0] as string;
    } else {
      dateStr = filename.split("与")[0] as string;
    }
    const issueDate = luxon.DateTime.fromFormat(dateStr, "yyyyMMdd");
    result.issue = issueDate.diff(
      luxon.DateTime.fromObject({ year: 2024, month: 7, day: 3 }),
      "days",
    ).days;
  } else {
    result = {
      date: luxon.DateTime.fromFormat(filename, "yyyyMMdd"),
    };
  }

  return result;
}
