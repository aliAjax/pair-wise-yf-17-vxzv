import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { AppData, PipeEntry, Session, Venue } from "./types";
import { loadData, saveData, uid } from "./storage";
import Workbench from "./components/Workbench";
import Report from "./components/Report";
import History from "./components/History";

type Tab = "workbench" | "report" | "history";

function today(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [tab, setTab] = useState<Tab>("workbench");
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const draft =
    data.sessions.find((s) => s.id === activeDraftId && s.status === "draft") ?? null;
  const reportSession = data.sessions.find((s) => s.id === reportId) ?? null;

  const lastArchived = useMemo(() => {
    if (!draft) return null;
    const list = data.sessions
      .filter((s) => s.status === "archived" && s.venueId === draft.venueId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return list[0] ?? null;
  }, [data.sessions, draft]);

  const updateSession = (id: string, fn: (s: Session) => Session) => {
    setData((d) => ({
      ...d,
      sessions: d.sessions.map((s) => (s.id === id ? fn(s) : s)),
    }));
  };

  /** 复制条目时按当前音栓定义重新解析；音栓已不存在则保留历史快照 */
  const cloneEntries = (entries: PipeEntry[]): PipeEntry[] =>
    entries.map((e) => {
      const stop = data.stops.find((s) => s.id === e.stopId);
      if (!stop) return { ...e, id: uid() };
      return {
        ...e,
        id: uid(),
        stopName: stop.name,
        category: stop.category,
        tolerance: stop.tolerance,
        abnormal: Math.abs(e.centDeviation) > stop.tolerance,
      };
    });

  const handleStart = (venueId: string, date: string) => {
    const venue = data.venues.find((v) => v.id === venueId);
    if (!venue || !date) return;
    const existing = data.sessions.find(
      (s) => s.status === "draft" && s.venueId === venueId && s.date === date
    );
    if (existing) {
      setActiveDraftId(existing.id);
      return;
    }
    const session: Session = {
      id: uid(),
      venueId,
      venueName: venue.name,
      date,
      status: "draft",
      entries: [],
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };
    setData((d) => ({ ...d, sessions: [...d.sessions, session] }));
    setActiveDraftId(session.id);
  };

  const handleAddVenue = (name: string, kind: Venue["kind"]) => {
    setData((d) => ({ ...d, venues: [...d.venues, { id: uid(), name, kind }] }));
  };

  const handleSaveEntry = (entry: PipeEntry, editingId: string | null) => {
    if (!draft) return;
    updateSession(draft.id, (s) => ({
      ...s,
      entries: editingId
        ? s.entries.map((e) => (e.id === editingId ? entry : e))
        : [...s.entries, entry],
    }));
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!draft) return;
    updateSession(draft.id, (s) => ({
      ...s,
      entries: s.entries.filter((e) => e.id !== entryId),
    }));
  };

  const handleArchive = () => {
    if (!draft || draft.entries.length === 0) return;
    const abnormal = draft.entries.filter((e) => e.abnormal).length;
    const ok = window.confirm(
      `确认完成本次维护并归档？\n共 ${draft.entries.length} 根音管，其中 ${abnormal} 根异常。\n归档后记录将不可修改。`
    );
    if (!ok) return;
    const archivedAt = new Date().toISOString();
    updateSession(draft.id, (s) => ({ ...s, status: "archived", archivedAt }));
    setReportId(draft.id);
    setActiveDraftId(null);
    setTab("report");
  };

  const handleDiscardDraft = () => {
    if (!draft) return;
    const ok = window.confirm("确认放弃当前草稿？已录入的记录将被删除。");
    if (!ok) return;
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== draft.id) }));
    setActiveDraftId(null);
  };

  const handleCopyFromLast = () => {
    if (!draft || !lastArchived) return;
    if (
      draft.entries.length > 0 &&
      !window.confirm(
        `当前草稿已有 ${draft.entries.length} 条记录，复制将追加 ${lastArchived.entries.length} 条，是否继续？`
      )
    ) {
      return;
    }
    const copies = cloneEntries(lastArchived.entries);
    updateSession(draft.id, (s) => ({ ...s, entries: [...s.entries, ...copies] }));
  };

  const handleCopyToNewDraft = (source: Session) => {
    const date = today();
    let target = data.sessions.find(
      (s) => s.status === "draft" && s.venueId === source.venueId && s.date === date
    );
    const copies = cloneEntries(source.entries);
    if (target) {
      updateSession(target.id, (s) => ({ ...s, entries: [...s.entries, ...copies] }));
    } else {
      target = {
        id: uid(),
        venueId: source.venueId,
        venueName: source.venueName,
        date,
        status: "draft",
        entries: copies,
        createdAt: new Date().toISOString(),
        archivedAt: null,
      };
      setData((d) => ({ ...d, sessions: [...d.sessions, target!] }));
    }
    setActiveDraftId(target.id);
    setTab("workbench");
  };

  const handleViewReport = (sessionId: string) => {
    setReportId(sessionId);
    setTab("report");
  };

  return (
    <main className="app">
      <section className="hero">
        <p>管风琴维护 · 单次维护工作台</p>
        <h1>管风琴音管调音记录</h1>
        <span>
          选定场馆和日期后逐根录入音管的音高、音分偏差、温湿度与簧片状态，偏差超出该音栓允许范围自动标记异常；
          维护完成后归档并生成报告，下次维护可从上次数据复制草稿。
        </span>
      </section>

      <nav className="tabs">
        <button className={tab === "workbench" ? "tab-active" : ""} onClick={() => setTab("workbench")}>
          维护工作台
        </button>
        <button className={tab === "report" ? "tab-active" : ""} onClick={() => setTab("report")}>
          维护报告
        </button>
        <button className={tab === "history" ? "tab-active" : ""} onClick={() => setTab("history")}>
          历史归档
        </button>
      </nav>

      {tab === "workbench" ? (
        <Workbench
          venues={data.venues}
          stops={data.stops}
          draft={draft}
          lastArchived={lastArchived}
          onStart={handleStart}
          onAddVenue={handleAddVenue}
          onSaveEntry={handleSaveEntry}
          onDeleteEntry={handleDeleteEntry}
          onArchive={handleArchive}
          onDiscardDraft={handleDiscardDraft}
          onCopyFromLast={handleCopyFromLast}
        />
      ) : null}

      {tab === "report" ? <Report session={reportSession} onCopyToNewDraft={handleCopyToNewDraft} /> : null}

      {tab === "history" ? <History sessions={data.sessions} onViewReport={handleViewReport} /> : null}
    </main>
  );
}

export default App;
