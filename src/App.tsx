import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { Archive } from "./Archive";
import { Report } from "./Report";
import { Workbench } from "./Workbench";
import { STOPS, type AppState, type PipeEntry, type Session } from "./data";
import { displayAbnormal, humidityRange, tempRange, uid } from "./logic";
import { loadState, saveState } from "./storage";

type View =
  | { name: "workbench" }
  | { name: "archive" }
  | { name: "report"; id: string };

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [view, setView] = useState<View>({ name: "workbench" });
  const [activeDraftId, setActiveDraftId] = useState<string | null>(
    () => loadState().sessions.find((s) => s.status === "draft")?.id ?? null
  );

  useEffect(() => {
    saveState(state);
  }, [state]);

  const activeDraft =
    state.sessions.find((s) => s.id === activeDraftId && s.status === "draft") ?? null;

  const updateSession = (updated: Session) =>
    setState((st) => ({
      ...st,
      sessions: st.sessions.map((s) => (s.id === updated.id ? updated : s)),
    }));

  const addVenue = (name: string, kind: string): string => {
    const id = uid();
    setState((st) => ({ ...st, venues: [...st.venues, { id, name, kind }] }));
    return id;
  };

  const copyEntries = (from: Session): PipeEntry[] =>
    from.entries.map((e) => ({ ...e, id: uid(), abnormal: null }));

  const startSession = (venueId: string, date: string, copyFromId: string | null) => {
    const venue = state.venues.find((v) => v.id === venueId);
    if (!venue) return;
    const source = copyFromId ? state.sessions.find((s) => s.id === copyFromId) : undefined;
    const session: Session = {
      id: uid(),
      venueId,
      venueName: `${venue.name} ${venue.kind}`,
      date,
      createdAt: new Date().toISOString(),
      archivedAt: null,
      status: "draft",
      copiedFrom: source ? source.id : null,
      entries: source ? copyEntries(source) : [],
    };
    setState((st) => ({ ...st, sessions: [...st.sessions, session] }));
    setActiveDraftId(session.id);
    setView({ name: "workbench" });
  };

  const archiveSession = (id: string) => {
    const now = new Date().toISOString();
    setState((st) => ({
      ...st,
      sessions: st.sessions.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "archived" as const,
              archivedAt: now,
              // 归档时冻结每根音管的异常判定结果
              entries: s.entries.map((e) => ({
                ...e,
                abnormal: Math.abs(e.cents) > e.toleranceCents,
              })),
            }
          : s
      ),
    }));
    if (activeDraftId === id) setActiveDraftId(null);
    setView({ name: "report", id });
  };

  const discardSession = (id: string) => {
    setState((st) => ({ ...st, sessions: st.sessions.filter((s) => s.id !== id) }));
    if (activeDraftId === id) setActiveDraftId(null);
  };

  const copyToNewDraft = (source: Session) => {
    const session: Session = {
      id: uid(),
      venueId: source.venueId,
      venueName: source.venueName,
      date: today(),
      createdAt: new Date().toISOString(),
      archivedAt: null,
      status: "draft",
      copiedFrom: source.id,
      entries: copyEntries(source),
    };
    setState((st) => ({ ...st, sessions: [...st.sessions, session] }));
    setActiveDraftId(session.id);
    setView({ name: "workbench" });
  };

  // 指标：优先展示进行中的草稿，否则最近一次维护
  const metricSession = useMemo(() => {
    if (activeDraft) return activeDraft;
    return [...state.sessions].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
  }, [activeDraft, state.sessions]);

  const archivedCount = state.sessions.filter((s) => s.status === "archived").length;
  const reportSession =
    view.name === "report" ? state.sessions.find((s) => s.id === view.id) ?? null : null;

  return (
    <main className="app">
      <section className="hero">
        <p>管风琴维护 · 单次维护工作台</p>
        <h1>管风琴音管调音记录</h1>
        <span>
          选定场馆与日期后逐根录入音管：音栓、音管编号、音高、音分偏差、温湿度、簧片状态与维修备注。
          偏差超出该音栓允许范围自动标记异常；维护完成后归档并生成报告，下次维护可从上次数据复制草稿。
        </span>
        <nav className="tabs">
          <button
            type="button"
            className={view.name === "workbench" ? "tab-active" : ""}
            onClick={() => setView({ name: "workbench" })}
          >
            工作台{activeDraft ? "（进行中）" : ""}
          </button>
          <button
            type="button"
            className={view.name === "archive" ? "tab-active" : ""}
            onClick={() => setView({ name: "archive" })}
          >
            归档记录（{archivedCount}）
          </button>
        </nav>
      </section>

      <section className="metrics">
        <article>
          <small>音栓数量</small>
          <strong>{STOPS.length}</strong>
        </article>
        <article>
          <small>偏差超限{metricSession ? `（${metricSession.date}）` : ""}</small>
          <strong className={metricSession && metricSession.entries.some(displayAbnormal) ? "text-danger" : ""}>
            {metricSession ? metricSession.entries.filter(displayAbnormal).length : "—"}
          </strong>
        </article>
        <article>
          <small>温度</small>
          <strong>{metricSession ? tempRange(metricSession) : "—"}</strong>
        </article>
        <article>
          <small>湿度</small>
          <strong>{metricSession ? humidityRange(metricSession) : "—"}</strong>
        </article>
      </section>

      {view.name === "workbench" && (
        <Workbench
          venues={state.venues}
          sessions={state.sessions}
          session={activeDraft}
          onStart={startSession}
          onAddVenue={addVenue}
          onUpdateSession={updateSession}
          onArchive={archiveSession}
          onDiscard={discardSession}
        />
      )}

      {view.name === "archive" && (
        <Archive
          sessions={state.sessions}
          onOpenReport={(id) => setView({ name: "report", id })}
          onContinueDraft={(id) => {
            setActiveDraftId(id);
            setView({ name: "workbench" });
          }}
          onDeleteDraft={discardSession}
        />
      )}

      {view.name === "report" &&
        (reportSession ? (
          <Report
            session={reportSession}
            onBack={() => setView({ name: "archive" })}
            onCopyToNew={copyToNewDraft}
          />
        ) : (
          <section className="panel">
            <p className="hint">未找到该次维护记录。</p>
            <button type="button" onClick={() => setView({ name: "archive" })}>
              返回归档记录
            </button>
          </section>
        ))}
    </main>
  );
}

export default App;
