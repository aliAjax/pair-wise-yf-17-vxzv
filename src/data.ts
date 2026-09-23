export type StopCategory = "主音栓" | "簧片音栓" | "混合音栓" | "低音管";

export interface Venue {
  id: string;
  name: string;
  kind: string;
}

export interface Stop {
  id: string;
  name: string;
  category: StopCategory;
  /** 允许偏差范围（±音分），超出即异常 */
  toleranceCents: number;
  /** 是否簧片音栓 */
  reed: boolean;
}

export interface PipeEntry {
  id: string;
  stopId: string;
  /** 以下为录入时快照，归档后不受音栓定义变化影响 */
  stopName: string;
  category: StopCategory;
  toleranceCents: number;
  reedStop: boolean;
  pipeNo: string;
  pitch: string;
  /** 音分偏差，正为偏高 */
  cents: number;
  temperature: number | null;
  humidity: number | null;
  reedStatus: string;
  note: string;
  /** 草稿时为 null（实时计算），归档时冻结 */
  abnormal: boolean | null;
}

export interface Session {
  id: string;
  venueId: string;
  venueName: string;
  date: string;
  createdAt: string;
  archivedAt: string | null;
  status: "draft" | "archived";
  copiedFrom: string | null;
  entries: PipeEntry[];
}

export interface AppState {
  venues: Venue[];
  sessions: Session[];
}

export const STOP_CATEGORIES: StopCategory[] = [
  "主音栓",
  "簧片音栓",
  "混合音栓",
  "低音管",
];

export const STOPS: Stop[] = [
  { id: "st-pr8", name: "Principal 8'", category: "主音栓", toleranceCents: 4, reed: false },
  { id: "st-pr4", name: "Principal 4'", category: "主音栓", toleranceCents: 4, reed: false },
  { id: "st-oct2", name: "Octave 2'", category: "主音栓", toleranceCents: 5, reed: false },
  { id: "st-tr8", name: "Trumpet 8'", category: "簧片音栓", toleranceCents: 8, reed: true },
  { id: "st-pos16", name: "Posaune 16'", category: "簧片音栓", toleranceCents: 8, reed: true },
  { id: "st-cl4", name: "Clairon 4'", category: "簧片音栓", toleranceCents: 8, reed: true },
  { id: "st-mix4", name: "Mixtur IV", category: "混合音栓", toleranceCents: 6, reed: false },
  { id: "st-zim3", name: "Zimbel III", category: "混合音栓", toleranceCents: 6, reed: false },
  { id: "st-bou16", name: "Bourdon 16'", category: "低音管", toleranceCents: 6, reed: false },
  { id: "st-sub16", name: "Subbass 16'", category: "低音管", toleranceCents: 6, reed: false },
];

export const DEFAULT_VENUES: Venue[] = [
  { id: "v-stmary", name: "St.Mary", kind: "教堂" },
  { id: "v-halla", name: "ConcertHall A", kind: "音乐厅" },
  { id: "v-abbey", name: "Abbey Room", kind: "教堂" },
];

export const REED_STATUSES = [
  "正常",
  "需微调",
  "积尘",
  "异响",
  "簧片损伤",
  "需更换",
  "不适用",
];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const PITCH_OPTIONS: string[] = [];
for (let octave = 1; octave <= 7; octave++) {
  for (const n of NOTE_NAMES) PITCH_OPTIONS.push(`${n}${octave}`);
}

export function findStop(id: string): Stop | undefined {
  return STOPS.find((s) => s.id === id);
}

/** 首次运行的种子数据：三个场馆各一次已归档维护（源自需求示例记录） */
export function seedState(): AppState {
  const mkEntry = (
    stopId: string,
    pipeNo: string,
    pitch: string,
    cents: number,
    temperature: number,
    humidity: number,
    reedStatus: string,
    note: string
  ): PipeEntry => {
    const stop = findStop(stopId)!;
    return {
      id: `seed-${stopId}-${pipeNo}`,
      stopId,
      stopName: stop.name,
      category: stop.category,
      toleranceCents: stop.toleranceCents,
      reedStop: stop.reed,
      pipeNo,
      pitch,
      cents,
      temperature,
      humidity,
      reedStatus,
      note,
      abnormal: Math.abs(cents) > stop.toleranceCents,
    };
  };

  const mkSession = (
    id: string,
    venue: Venue,
    date: string,
    entries: PipeEntry[]
  ): Session => ({
    id,
    venueId: venue.id,
    venueName: `${venue.name} ${venue.kind}`,
    date,
    createdAt: `${date}T09:30:00.000Z`,
    archivedAt: `${date}T11:45:00.000Z`,
    status: "archived",
    copiedFrom: null,
    entries,
  });

  return {
    venues: DEFAULT_VENUES,
    sessions: [
      mkSession("seed-s1", DEFAULT_VENUES[0], "2026-08-15", [
        mkEntry("st-tr8", "T-037", "C#4", 9, 21.5, 55, "需微调", "簧片需微调"),
      ]),
      mkSession("seed-s2", DEFAULT_VENUES[1], "2026-08-22", [
        mkEntry("st-pr4", "P-112", "G3", -3, 22.0, 48, "不适用", "正常"),
      ]),
      mkSession("seed-s3", DEFAULT_VENUES[2], "2026-09-05", [
        mkEntry("st-bou16", "B-008", "F2", -12, 19.8, 62, "不适用", "标记复检"),
      ]),
    ],
  };
}
