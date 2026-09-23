import type { PipeEntry } from "./types";
import { ENV_RANGE } from "./types";

export function isAbnormal(centDeviation: number, tolerance: number): boolean {
  return Math.abs(centDeviation) > tolerance;
}

/** 格式化带符号的音分偏差，如 +9 / -3 */
export function formatCent(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

/** 针对单根音管生成处理建议 */
export function adviceFor(entry: PipeEntry): string[] {
  const tips: string[] = [];
  const abs = Math.abs(entry.centDeviation);

  if (entry.abnormal) {
    const dir = entry.centDeviation > 0 ? "偏高" : "偏低";
    const fix = entry.centDeviation > 0 ? "调低" : "调高";
    tips.push(
      `音高${dir} ${abs} 音分（允许 ±${entry.tolerance}）：建议${fix}音管至允许范围内`
    );
    if (abs > entry.tolerance * 2) {
      tips.push("偏差超过允许范围两倍，建议优先安排重修");
    }
  }

  switch (entry.reedStatus) {
    case "需微调":
      tips.push("簧片需微调，调音时一并校正");
      break;
    case "松动":
      tips.push("簧片松动，需重新固定并复检");
      break;
    case "锈蚀":
      tips.push("簧片锈蚀，建议更换簧片");
      break;
    case "异响":
      tips.push("簧片异响，检查簧舌与簧管接触");
      break;
  }

  if (
    entry.temperature !== null &&
    (entry.temperature < ENV_RANGE.temperature.min || entry.temperature > ENV_RANGE.temperature.max)
  ) {
    tips.push(
      `现场温度 ${entry.temperature}℃ 超出 ${ENV_RANGE.temperature.min}–${ENV_RANGE.temperature.max}℃ 适宜区间，注意温度对音高的影响`
    );
  }
  if (
    entry.humidity !== null &&
    (entry.humidity < ENV_RANGE.humidity.min || entry.humidity > ENV_RANGE.humidity.max)
  ) {
    tips.push(
      `现场湿度 ${entry.humidity}% 超出 ${ENV_RANGE.humidity.min}–${ENV_RANGE.humidity.max}% 适宜区间，建议改善场馆环境`
    );
  }

  if (tips.length === 0) {
    tips.push("状态良好，常规保养即可");
  }
  return tips;
}

/** 汇总一组录入的环境指标 */
export function envSummary(entries: PipeEntry[]): {
  avgTemp: number | null;
  avgHumidity: number | null;
} {
  const temps = entries.map((e) => e.temperature).filter((v): v is number => v !== null);
  const hums = entries.map((e) => e.humidity).filter((v): v is number => v !== null);
  const avg = (list: number[]) =>
    list.length === 0 ? null : Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10;
  return { avgTemp: avg(temps), avgHumidity: avg(hums) };
}
