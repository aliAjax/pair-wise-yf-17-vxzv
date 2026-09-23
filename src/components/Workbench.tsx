import { useEffect, useMemo, useState } from "react";
import type { PipeEntry, ReedStatus, Session, StopCategory, StopDef, Venue } from "../types";
import { CATEGORIES, REED_STATUSES } from "../types";
import { envSummary, formatCent, isAbnormal } from "../advice";

interface EntryFormState {
  stopId: string;
  pipeNo: string;
  pitch: string;
  centDeviation: string;
  temperature: string;
  humidity: string;
  reedStatus: ReedStatus;
  note: string;
}

const emptyForm: EntryFormState = {
  stopId: "",
  pipeNo: "",
  pitch: "",
  centDeviation: "",
  temperature: "",
  humidity: "",
  reedStatus: "不适用",
  note: "",
};

interface Props {
  venues: Venue[];
  stops: StopDef[];
  draft: Session | null;
  lastArchived: Session | null;
  onStart: (venueId: string, date: string) => void;
  onAddVenue: (name: string, kind: Venue["kind"]) => void;
  onSaveEntry: (entry: PipeEntry, editingId: string | null) => void;
  onDeleteEntry: (entryId: string) => void;
  onArchive: () => void;
  onDiscardDraft: () => void;
  onCopyFromLast: () => void;
}

function today(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function Workbench(props: Props) {
  const { venues, stops, draft, lastArchived } = props;
  const [venueId, setVenueId] = useState(draft?.venueId ?? venues[0]?.id ?? "");
  const [date, setDate] = useState(draft?.date ?? today());
  const [form, setForm] = useState<EntryFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StopCategory | "全部" | "异常">("全部");
  const [error, setError] = useState("");
  const [addingVenue, setAddingVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueKind, setNewVenueKind] = useState<Venue["kind"]>("教堂");

  // 切换草稿时同步场馆和日期
  useEffect(() => {
    if (draft) {
      setVenueId(draft.venueId);
      setDate(draft.date);
    }
  }, [draft?.id]);

  const selectedStop = stops.find((s) => s.id === form.stopId) ?? null;
  const deviationNum = Number(form.centDeviation);
  const liveAbnormal =
    selectedStop !== null &&
    form.centDeviation.trim() !== "" &&
    !Number.isNaN(deviationNum) &&
    isAbnormal(deviationNum, selectedStop.tolerance);

  const entries = draft?.entries ?? [];
  const summary = useMemo(() => {
    const stopCount = new Set(entries.map((e) => e.stopId)).size;
    const abnormalCount = entries.filter((e) => e.abnormal).length;
    const { avgTemp, avgHumidity } = envSummary(entries);
    return { stopCount, abnormalCount, avgTemp, avgHumidity };
  }, [entries]);

  const filteredEntries = entries.filter((e) => {
    if (filter === "全部") return true;
    if (filter === "异常") return e.abnormal;
    return e.category === filter;
  });

  const setField = <K extends keyof EntryFormState>(key: K, value: EntryFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleStopChange = (stopId: string) => {
    const stop = stops.find((s) => s.id === stopId);
    setForm((f) => ({
      ...f,
      stopId,
      // 非簧片音栓默认"不适用"，簧片音栓默认"正常"
      reedStatus: stop ? (stop.category === "簧片音栓" ? "正常" : "不适用") : f.reedStatus,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  const handleSubmit = () => {
    if (!draft) return;
    if (!selectedStop) {
      setError("请选择音栓");
      return;
    }
    if (!form.pipeNo.trim()) {
      setError("请填写音管编号");
      return;
    }
    if (!form.pitch.trim()) {
      setError("请填写音高，如 C#4");
      return;
    }
    if (form.centDeviation.trim() === "" || Number.isNaN(deviationNum)) {
      setError("请填写有效的音分偏差数值");
      return;
    }
    const temp = form.temperature.trim() === "" ? null : Number(form.temperature);
    const hum = form.humidity.trim() === "" ? null : Number(form.humidity);
    if (form.temperature.trim() !== "" && Number.isNaN(temp)) {
      setError("温度需为数值");
      return;
    }
    if (form.humidity.trim() !== "" && Number.isNaN(hum)) {
      setError("湿度需为数值");
      return;
    }

    const entry: PipeEntry = {
      id: editingId ?? `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      stopId: selectedStop.id,
      stopName: selectedStop.name,
      category: selectedStop.category,
      tolerance: selectedStop.tolerance,
      abnormal: isAbnormal(deviationNum, selectedStop.tolerance),
      pipeNo: form.pipeNo.trim(),
      pitch: form.pitch.trim(),
      centDeviation: deviationNum,
      temperature: temp,
      humidity: hum,
      reedStatus: form.reedStatus,
      note: form.note.trim(),
    };
    props.onSaveEntry(entry, editingId);
    resetForm();
  };

  const handleEdit = (entry: PipeEntry) => {
    setEditingId(entry.id);
    setForm({
      stopId: entry.stopId,
      pipeNo: entry.pipeNo,
      pitch: entry.pitch,
      centDeviation: String(entry.centDeviation),
      temperature: entry.temperature === null ? "" : String(entry.temperature),
      humidity: entry.humidity === null ? "" : String(entry.humidity),
      reedStatus: entry.reedStatus,
      note: entry.note,
    });
    setError("");
  };

  const handleAddVenue = () => {
    const name = newVenueName.trim();
    if (!name) return;
    props.onAddVenue(name, newVenueKind);
    setNewVenueName("");
    setAddingVenue(false);
  };

  return (
    <>
      <section className="metrics">
        <article>
          <small>音栓数量</small>
          <strong>{summary.stopCount}</strong>
        </article>
        <article className={summary.abnormalCount > 0 ? "metric-danger" : ""}>
          <small>偏差超限</small>
          <strong>{summary.abnormalCount}</strong>
        </article>
        <article>
          <small>温度</small>
          <strong>{summary.avgTemp === null ? "—" : `${summary.avgTemp}℃`}</strong>
        </article>
        <article>
          <small>湿度</small>
          <strong>{summary.avgHumidity === null ? "—" : `${summary.avgHumidity}%`}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>单次维护</p>
            <h2>选择场馆与日期</h2>
          </div>
          {draft ? (
            <button className="danger-outline" onClick={props.onDiscardDraft}>
              放弃草稿
            </button>
          ) : null}
        </div>
        <div className="session-bar">
          <label>
            <span>场馆名称</span>
            <select
              value={venueId}
              disabled={!!draft}
              onChange={(e) => setVenueId(e.target.value)}
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}（{v.kind}）
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>维护日期</span>
            <input
              type="date"
              value={date}
              disabled={!!draft}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {!draft ? (
            <button className="primary" onClick={() => props.onStart(venueId, date)}>
              开始维护
            </button>
          ) : (
            <span className="session-status">维护进行中 · 已录入 {entries.length} 根音管</span>
          )}
        </div>
        {!draft && addingVenue ? (
          <div className="session-bar new-venue-bar">
            <label>
              <span>新场馆名称</span>
              <input
                value={newVenueName}
                placeholder="如 St.Paul 教堂"
                onChange={(e) => setNewVenueName(e.target.value)}
              />
            </label>
            <label>
              <span>类型</span>
              <select
                value={newVenueKind}
                onChange={(e) => setNewVenueKind(e.target.value as Venue["kind"])}
              >
                <option>教堂</option>
                <option>音乐厅</option>
                <option>其他</option>
              </select>
            </label>
            <button onClick={handleAddVenue}>确认添加</button>
            <button onClick={() => setAddingVenue(false)}>取消</button>
          </div>
        ) : null}
        {!draft && !addingVenue ? (
          <button className="link-btn" onClick={() => setAddingVenue(true)}>
            ＋ 新增场馆
          </button>
        ) : null}
        {draft && lastArchived ? (
          <div className="notice">
            上次维护：{lastArchived.date}（{lastArchived.entries.length} 条记录）。
            <button className="link-btn" onClick={props.onCopyFromLast}>
              从上次维护复制草稿
            </button>
          </div>
        ) : null}
      </section>

      {draft ? (
        <>
          <section className="panel form-panel">
            <div className="heading">
              <div>
                <p>逐根录入</p>
                <h2>{editingId ? "编辑音管记录" : "新增音管记录"}</h2>
              </div>
              {editingId ? <button onClick={resetForm}>取消编辑</button> : null}
            </div>
            <div className="field-grid">
              <label>
                <span>音栓</span>
                <select value={form.stopId} onChange={(e) => handleStopChange(e.target.value)}>
                  <option value="">请选择音栓</option>
                  {CATEGORIES.map((cat) => (
                    <optgroup key={cat} label={cat}>
                      {stops
                        .filter((s) => s.category === cat)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}（允许 ±{s.tolerance} 音分）
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label>
                <span>音管编号</span>
                <input
                  value={form.pipeNo}
                  placeholder="如 R-12"
                  onChange={(e) => setField("pipeNo", e.target.value)}
                />
              </label>
              <label>
                <span>音高</span>
                <input
                  value={form.pitch}
                  placeholder="如 C#4"
                  onChange={(e) => setField("pitch", e.target.value)}
                />
              </label>
              <label>
                <span>音分偏差</span>
                <input
                  type="number"
                  value={form.centDeviation}
                  placeholder="偏高为正，偏低为负"
                  onChange={(e) => setField("centDeviation", e.target.value)}
                />
              </label>
              <label>
                <span>温度（℃）</span>
                <input
                  type="number"
                  value={form.temperature}
                  placeholder="如 22"
                  onChange={(e) => setField("temperature", e.target.value)}
                />
              </label>
              <label>
                <span>湿度（%）</span>
                <input
                  type="number"
                  value={form.humidity}
                  placeholder="如 55"
                  onChange={(e) => setField("humidity", e.target.value)}
                />
              </label>
              <label>
                <span>簧片状态</span>
                <select
                  value={form.reedStatus}
                  onChange={(e) => setField("reedStatus", e.target.value as ReedStatus)}
                >
                  {REED_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>维修备注</span>
                <input
                  value={form.note}
                  placeholder="选填"
                  onChange={(e) => setField("note", e.target.value)}
                />
              </label>
            </div>

            {selectedStop && form.centDeviation.trim() !== "" && !Number.isNaN(deviationNum) ? (
              <p className={liveAbnormal ? "judge abnormal" : "judge normal"}>
                {liveAbnormal
                  ? `异常：偏差 ${formatCent(deviationNum)} 音分，超出 ${selectedStop.name} 允许范围 ±${selectedStop.tolerance} 音分`
                  : `正常：偏差 ${formatCent(deviationNum)} 音分，在 ±${selectedStop.tolerance} 音分范围内`}
              </p>
            ) : null}
            {error ? <p className="judge abnormal">{error}</p> : null}

            <div className="actions">
              <button className="primary" onClick={handleSubmit}>
                {editingId ? "保存修改" : "录入这根音管"}
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="heading">
              <div>
                <p>调音偏差表</p>
                <h2>本次维护已录入 {entries.length} 根音管</h2>
              </div>
              <button
                className="primary"
                disabled={entries.length === 0}
                onClick={props.onArchive}
              >
                完成维护并归档
              </button>
            </div>
            <div className="chips">
              {(["全部", ...CATEGORIES, "异常"] as const).map((c) => (
                <button
                  key={c}
                  className={filter === c ? "chip-active" : ""}
                  onClick={() => setFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            {filteredEntries.length === 0 ? (
              <p className="empty">暂无记录，请在上方逐根录入音管。</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>音栓</th>
                      <th>音管编号</th>
                      <th>音高</th>
                      <th>偏差(音分)</th>
                      <th>允许范围</th>
                      <th>温度</th>
                      <th>湿度</th>
                      <th>簧片状态</th>
                      <th>备注</th>
                      <th>判定</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((e) => (
                      <tr key={e.id} className={e.abnormal ? "row-abnormal" : ""}>
                        <td>{e.stopName}</td>
                        <td>{e.pipeNo}</td>
                        <td>{e.pitch}</td>
                        <td>{formatCent(e.centDeviation)}</td>
                        <td>±{e.tolerance}</td>
                        <td>{e.temperature === null ? "—" : `${e.temperature}℃`}</td>
                        <td>{e.humidity === null ? "—" : `${e.humidity}%`}</td>
                        <td>{e.reedStatus}</td>
                        <td>{e.note || "—"}</td>
                        <td>
                          <span className={e.abnormal ? "badge danger" : "badge ok"}>
                            {e.abnormal ? "异常" : "正常"}
                          </span>
                        </td>
                        <td className="row-actions">
                          <button className="link-btn" onClick={() => handleEdit(e)}>
                            编辑
                          </button>
                          <button className="link-btn" onClick={() => props.onDeleteEntry(e.id)}>
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="panel">
          <p className="empty">请选择场馆和日期，点击「开始维护」进入单次维护工作台。</p>
        </section>
      )}
    </>
  );
}
