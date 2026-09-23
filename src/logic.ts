import type { PipeEntry, Session } from "./data";

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 草稿态实时判定：偏差绝对值超出该音栓允许范围即异常 */
export function isAbnormal(e: PipeEntry): boolean {
  return Math.abs(e.cents) > e.toleranceCents;
}

/** 展示用：归档后读冻结结果，草稿读实时计算 */
export function displayAbnormal(e: PipeEntry): boolean {
  return e.abnormal ?? isAbnormal(e);
}

export function fmtSigned(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function abnormalEntries(s: Session): PipeEntry[] {
  return s.entries.filter(displayAbnormal);
}

/** 针对单根异常音管生成处理建议 */
export function suggestionsFor(e: PipeEntry): string[] {
  const list: string[] = [];
  const over = Math.abs(e.cents) - e.toleranceCents;
  if (e.cents > e.toleranceCents) {
    list.push(
      e.reedStop
        ? `音高偏高 ${fmtSigned(e.cents)} 音分（超限 ${over}）：将簧片调音丝向下拨，加长簧片有效振动部分，复测至 ±${e.toleranceCents} 音分内`
        : `音高偏高 ${fmtSigned(e.cents)} 音分（超限 ${over}）：放下音塞/调音环以加长音管，复测至 ±${e.toleranceCents} 音分内`
    );
  } else if (e.cents < -e.toleranceCents) {
    list.push(
      e.reedStop
        ? `音高偏低 ${fmtSigned(e.cents)} 音分（超限 ${over}）：将簧片调音丝向上拨，缩短簧片有效振动部分，复测至 ±${e.toleranceCents} 音分内`
        : `音高偏低 ${fmtSigned(e.cents)} 音分（超限 ${over}）：提起音塞/调音环以缩短音管，复测至 ±${e.toleranceCents} 音分内`
    );
  }
  if (e.reedStatus && e.reedStatus !== "正常" && e.reedStatus !== "不适用") {
    list.push(`簧片状态「${e.reedStatus}」：清洁簧舌与共鸣管，检查簧舌弧度，必要时更换簧片`);
  }
  if (e.temperature !== null && (e.temperature < 12 || e.temperature > 28)) {
    list.push(`现场温度 ${e.temperature}℃ 偏离标准调音环境，建议环境稳定后复测确认`);
  }
  if (list.length === 0) list.push("偏差在允许范围内，无需处理");
  return list;
}

export function tempRange(s: Session): string {
  const vals = s.entries.map((e) => e.temperature).filter((v): v is number => v !== null);
  if (vals.length === 0) return "—";
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return min === max ? `${min}℃` : `${min}~${max}℃`;
}

export function humidityRange(s: Session): string {
  const vals = s.entries.map((e) => e.humidity).filter((v): v is number => v !== null);
  if (vals.length === 0) return "—";
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return min === max ? `${min}%` : `${min}~${max}%`;
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
