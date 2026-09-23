import { seedState, type AppState } from "./data";

const KEY = "organ-maintenance-v1";

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.venues) && Array.isArray(parsed.sessions)) {
        return parsed as AppState;
      }
    }
  } catch {
    /* 本地数据损坏时回退到种子数据 */
  }
  return seedState();
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 存储不可用时静默失败，页面内状态仍可用 */
  }
}
