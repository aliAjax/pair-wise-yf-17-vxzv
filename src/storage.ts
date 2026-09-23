import type { AppData, PipeEntry, Session, StopDef, Venue } from "./types";

const STORAGE_KEY = "organ-maintenance-v1";

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const seedVenues: Venue[] = [
  { id: "v-stmary", name: "St.Mary 教堂", kind: "教堂" },
  { id: "v-halla", name: "ConcertHall A", kind: "音乐厅" },
  { id: "v-abbey", name: "Abbey Room", kind: "教堂" },
];

const seedStops: StopDef[] = [
  { id: "s-p8", name: "Principal 8'", category: "主音栓", tolerance: 4 },
  { id: "s-p4", name: "Principal 4'", category: "主音栓", tolerance: 4 },
  { id: "s-oct2", name: "Octave 2'", category: "主音栓", tolerance: 5 },
  { id: "s-tr8", name: "Trumpet 8'", category: "簧片音栓", tolerance: 6 },
  { id: "s-cl4", name: "Clarion 4'", category: "簧片音栓", tolerance: 6 },
  { id: "s-mix", name: "Mixture IV", category: "混合音栓", tolerance: 7 },
  { id: "s-b16", name: "Bourdon 16'", category: "低音管", tolerance: 8 },
  { id: "s-sb16", name: "Subbass 16'", category: "低音管", tolerance: 8 },
];

function seedEntry(partial: Omit<PipeEntry, "id">): PipeEntry {
  return { id: uid(), ...partial };
}

const seedSession: Session = {
  id: "seed-session-1",
  venueId: "v-stmary",
  venueName: "St.Mary 教堂",
  date: "2026-08-19",
  status: "archived",
  createdAt: "2026-08-19T09:12:00.000Z",
  archivedAt: "2026-08-19T11:40:00.000Z",
  entries: [
    seedEntry({
      stopId: "s-tr8",
      stopName: "Trumpet 8'",
      category: "簧片音栓",
      tolerance: 6,
      abnormal: true,
      pipeNo: "R-12",
      pitch: "C#4",
      centDeviation: 9,
      temperature: 24,
      humidity: 58,
      reedStatus: "需微调",
      note: "簧片需微调",
    }),
    seedEntry({
      stopId: "s-p4",
      stopName: "Principal 4'",
      category: "主音栓",
      tolerance: 4,
      abnormal: false,
      pipeNo: "P-31",
      pitch: "G3",
      centDeviation: -3,
      temperature: 24,
      humidity: 58,
      reedStatus: "不适用",
      note: "正常",
    }),
    seedEntry({
      stopId: "s-b16",
      stopName: "Bourdon 16'",
      category: "低音管",
      tolerance: 8,
      abnormal: true,
      pipeNo: "B-05",
      pitch: "F2",
      centDeviation: -12,
      temperature: 23,
      humidity: 60,
      reedStatus: "不适用",
      note: "标记复检",
    }),
    seedEntry({
      stopId: "s-mix",
      stopName: "Mixture IV",
      category: "混合音栓",
      tolerance: 7,
      abnormal: false,
      pipeNo: "M-18",
      pitch: "C5",
      centDeviation: 5,
      temperature: 24,
      humidity: 58,
      reedStatus: "不适用",
      note: "",
    }),
    seedEntry({
      stopId: "s-cl4",
      stopName: "Clarion 4'",
      category: "簧片音栓",
      tolerance: 6,
      abnormal: true,
      pipeNo: "C-07",
      pitch: "A4",
      centDeviation: 11,
      temperature: 24,
      humidity: 57,
      reedStatus: "锈蚀",
      note: "簧片锈蚀",
    }),
  ],
};

const seedData: AppData = {
  venues: seedVenues,
  stops: seedStops,
  sessions: [seedSession],
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedData;
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.venues || !parsed.stops || !parsed.sessions) return seedData;
    return parsed;
  } catch {
    return seedData;
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 存储不可用时静默失败，页面内状态仍可用
  }
}
