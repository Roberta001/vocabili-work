/**
 * 全部整合到Board对象。
 */
import { DateTime } from "luxon";
import { endTimeOf, issueNow, startTimeOf } from "./date";

export type Section = "daily" | "weekly" | "monthly" | "special";
export type BasicSection = "daily" | "weekly" | "monthly";

const basicSections = ["daily", "weekly", "monthly"] as const;

function isBasicSection(section: Section): section is BasicSection {
  return basicSections.includes(section as BasicSection);
}

// 现在时间已经过了哪一期的截止时间。
export const currentIssue = issueNow();

export default class Board {
  name: string = "vocaloid";
  section: Section = "daily";
  part: string = "main";
  issue: number = -1;

  /**
   *
   * @param boardId 可以传入 boardId，也可以只传 name 和 section。
   * @param issue 默认是当天
   */
  constructor(boardId: string, issue?: number) {
    const items = boardId.split("-", 3);
    this.name = items[0]!;
    this.section = items[1] as Section;
    if (items.length === 3) {
      this.part = items[2]!;
    } else {
      this.part = "main";
    }
    if (issue) {
      this.issue = Number(issue);
    } else if (this.section === "special") {
      this.issue = 1;
    } else {
      this.issue = currentIssue[this.section];
    }
  }

  // 特殊构造方法
  /**
   * issue 是 -1
   */
  static latest(boardId: string): Board {
    const board = new Board(boardId);
    board.issue = -1;
    return board;
  }

  get id(): string {
    return [this.name, this.section].join("-");
  }
  set id(value: string) {
    [this.name, this.section] = value.split("-") as unknown as [
      string,
      Section,
    ];
  }
  get fullId(): string {
    return [this.name, this.section, this.part].join("-");
  }
  get startTime(): DateTime | null {
    if (isBasicSection(this.section)) {
      return startTimeOf(this.issue, this.section);
    } else {
      return null;
    }
  }
  get endTime(): DateTime | null {
    if (isBasicSection(this.section)) {
      return endTimeOf(this.issue, this.section);
    } else {
      return null;
    }
  }

  getBoardName() {
    const issueNum = this.issue;
    if (this.section === "daily") {
      return `日刊虚拟歌手外语排行榜 #${issueNum}`;
    } else if (this.section === "weekly") {
      return `周刊虚拟歌手外语排行榜 #${issueNum}`;
    } else if (this.section === "monthly") {
      return `月刊虚拟歌手外语排行榜 #${issueNum}`;
    } else if (this.section === "special") {
      return `专题虚拟歌手外语排行榜 #${issueNum}`;
    }
  }

  getRankDateString() {
    const issueNum = this.issue;
    if (this.section === "daily") {
      const firstDate = DateTime.local(2024, 7, 3);
      const startDate = firstDate.plus({ days: issueNum - 1 });
      const endDate = firstDate.plus({ days: issueNum });
      return `${startDate.toFormat("yyyy-MM-dd HH:mm")}——${endDate.toFormat("yyyy-MM-dd HH:mm")}`;
    } else if (this.section === "weekly") {
      const firstDate = DateTime.local(2024, 8, 31);
      const startDate = firstDate.plus({ weeks: issueNum - 1 });
      const endDate = firstDate.plus({ weeks: issueNum });
      return `${startDate.toFormat("yyyy-MM-dd HH:mm")}——${endDate.toFormat("yyyy-MM-dd HH:mm")}`;
    } else {
      const firstDate = DateTime.local(2024, 7, 1);
      const startDate = firstDate.plus({ months: issueNum - 1 });
      const endDate = firstDate.plus({ months: issueNum });
      return `${startDate.toFormat("yyyy-MM-dd HH:mm")}——${endDate.toFormat("yyyy-MM-dd HH:mm")}`;
    }
  }
}
