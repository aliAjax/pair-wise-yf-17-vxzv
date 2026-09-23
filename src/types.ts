export type StopCategory = "主音栓" | "簧片音栓" | "混合音栓" | "低音管";

export type ReedStatus = "正常" | "需微调" | "松动" | "锈蚀" | "异响" | "不适用";

export interface Venue {
  id: string;
  name: string;
  kind: "教堂" | "音乐厅" | "其他";
}

export interface StopDef {
  id: string;
  name: string;
  category: StopCategory;
  /** 允许的音分偏差范围（±cent） */
  tolerance: number;
}

export interface PipeEntry {
  id: string;
  stopId: string;
  /** 以下为录入时的快照，归档后不随音栓定义变化 */
  stopName: string;
  category: StopCategory;
  tolerance: number;
  abnormal: boolean;
  /** 录入字段 */
  pipeNo: string;
  pitch: string;
  centDeviation: number;
  temperature: number | null;
  humidity: number | null;
  reedStatus: ReedStatus;
  note: string;
}

export interface Session {
  id: string;
  venueId: string;
  venueName: string;
  date: string; // yyyy-mm-dd
  status: "draft" | "archived";
  entries: PipeEntry[];
  createdAt: string;
  archivedAt: string | null;
}

export interface AppData {
  venues: Venue[];
  stops: StopDef[];
  sessions: Session[];
}

export const CATEGORIES: StopCategory[] = ["主音栓", "簧片音栓", "混合音栓", "低音管"];

export const REED_STATUSES: ReedStatus[] = ["正常", "需微调", "松动", "锈蚀", "异响", "不适用"];

/** 适宜环境区间，用于报告中的环境建议 */
export const ENV_RANGE = {
  temperature: { min: 15, max: 28 },
  humidity: { min: 40, max: 70 },
};
