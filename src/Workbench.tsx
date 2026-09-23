import { useMemo, useState } from "react";
import {
  PITCH_OPTIONS,
  REED_STATUSES,
  STOPS,
  STOP_CATEGORIES,
  findStop,
  type PipeEntry,
  type Session,
  type StopCategory,
  type Venue,
} from "./data";
import { displayAbnormal, fmtSigned, uid } from "./logic";

interface WorkbenchProps {
  venues: Venue[];
  sessions: Session[];
  session: Session | null;
  onStart: (venueId: string, date: string, copyFromId: string | null) => void;
  onAddVenue: (name: string, kind: string) => string;
  onUpdateSession: (s: Session) => void;
  onArchive: (id: string) => void;
  onDiscard: (id: string) => void;
}

interface FormState {
  stopId: string;
  pipeNo: string;
  pitch: string;
  cents: string;
  temperature: string;
  humidity: string;
  reedStatus: string;
  note: string;
}

const emptyForm = (): FormState => ({
  stopId: STOPS[0].id,
  pipeNo: "",
  pitch: "",
  cents: "0",
  temperature: "",
  humidity: "",
  reedStatus: STOPS[0].reed ? "正常" : "不适用",
  note: "",
});

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function Workbench(props: WorkbenchProps) {
  const { session } = props;
  if (!session) return <StartCard {...props} />;
  return <ActiveSession {...props} session={session} />;
}

/** 开工卡片：选定场馆与日期，可选择从上次维护复制草稿 */
function StartCard(props: WorkbenchProps) {
  const { venues, sessions } = props;
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [newVenue, setNewVenue] = useState("");
  const [newKind, setNewKind] = useState("教堂");

  const lastForVenue = useMemo(
    () =>
      sessions
        .filter((s) => s.venueId === venueId)
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    [sessions, venueId]
  );

  const addVenue = () => {
    const name = newVenue.trim();
    if (!name) return;
    const id = props.onAddVenue(name, newKind);
    setVenueId(id);
    setNewVenue("");
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>单次维护</p>
          <h2>开始新的维护</h2>
        </div>
      </div>
      <div className="start-grid">
        <label>
          <span>场馆</span>
          <select value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}（{v.kind}）
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>维护日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <div className="venue-add">
        <input
          placeholder="新场馆名称"
          value={newVenue}
          onChange={(e) => setNewVenue(e.target.value)}
        />
        <select value={newKind} onChange={(e) => setNewKind(e.target.value)}>
          <option>教堂</option>
          <option>音乐厅</option>
          <option>其他</option>
        </select>
        <button type="button" onClick={addVenue} disabled={!newVenue.trim()}>
          添加场馆
        </button>
      </div>
      <div className="start-actions">
        <button
          className="primary"
          type="button"
          disabled={!venueId || !date}
          onClick={() => props.onStart(venueId, date, null)}
        >
          开始空白维护
        </button>
        {lastForVenue && (
          <button
            type="button"
            disabled={!date}
            onClick={() => props.onStart(venueId, date, lastForVenue.id)}
          >
            从上次维护复制草稿（{lastForVenue.date} · {lastForVenue.entries.length} 根音管
            {lastForVenue.status === "draft" ? " · 草稿" : ""}）
          </button>
        )}
      </div>
      {lastForVenue && (
        <p className="hint">
          复制仅生成新草稿，{lastForVenue.date} 的{lastForVenue.status === "archived" ? "归档记录" : "记录"}
          保持原样；上次异常 {lastForVenue.entries.filter(displayAbnormal).length} 根可优先复检。
        </p>
      )}
    </section>
  );
}

/** 进行中的维护：逐根录入 + 偏差表 + 归档 */
function ActiveSession(props: WorkbenchProps & { session: Session }) {
  const { session } = props;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StopCategory | "全部">("全部");

  const abnormalCount = session.entries.filter(displayAbnormal).length;
  const stop = findStop(form.stopId);
  const previewAbnormal =
    stop !== undefined && Math.abs(Number(form.cents) || 0) > stop.toleranceCents;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onStopChange = (stopId: string) => {
    const s = findStop(stopId);
    setForm((f) => ({
      ...f,
      stopId,
      reedStatus: s?.reed ? "正常" : "不适用",
    }));
  };

  const submit = () => {
    const s = findStop(form.stopId);
    if (!s) return;
    if (!form.pipeNo.trim()) {
      alert("请填写音管编号");
      return;
    }
    if (!form.pitch.trim()) {
      alert("请填写音高（如 C#4）");
      return;
    }
    const cents = Number(form.cents);
    if (form.cents.trim() === "" || Number.isNaN(cents)) {
      alert("请填写有效的音分偏差数字");
      return;
    }
    if (form.temperature.trim() !== "" && Number.isNaN(Number(form.temperature))) {
      alert("请填写有效的温度数字");
      return;
    }
    if (form.humidity.trim() !== "" && Number.isNaN(Number(form.humidity))) {
      alert("请填写有效的湿度数字");
      return;
    }
    const entry: PipeEntry = {
      id: editingId ?? uid(),
      stopId: s.id,
      stopName: s.name,
      category: s.category,
      toleranceCents: s.toleranceCents,
      reedStop: s.reed,
      pipeNo: form.pipeNo.trim(),
      pitch: form.pitch.trim(),
      cents,
      temperature: form.temperature.trim() === "" ? null : Number(form.temperature),
      humidity: form.humidity.trim() === "" ? null : Number(form.humidity),
      reedStatus: form.reedStatus,
      note: form.note.trim(),
      abnormal: null,
    };
    const entries = editingId
      ? session.entries.map((e) => (e.id === editingId ? entry : e))
      : [...session.entries, entry];
    props.onUpdateSession({ ...session, entries });
    // 保留音栓与温湿度，方便同一音栓连续录入
    setForm((f) => ({ ...emptyForm(), stopId: f.stopId, reedStatus: f.reedStatus, temperature: f.temperature, humidity: f.humidity }));
    setEditingId(null);
  };

  const editEntry = (e: PipeEntry) => {
    setEditingId(e.id);
    setForm({
      stopId: e.stopId,
      pipeNo: e.pipeNo,
      pitch: e.pitch,
      cents: String(e.cents),
      temperature: e.temperature === null ? "" : String(e.temperature),
      humidity: e.humidity === null ? "" : String(e.humidity),
      reedStatus: e.reedStatus,
      note: e.note,
    });
  };

  const removeEntry = (id: string) => {
    props.onUpdateSession({ ...session, entries: session.entries.filter((e) => e.id !== id) });
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm());
    }
  };

  const archive = () => {
    if (session.entries.length === 0) return;
    if (window.confirm(`归档后本次记录将不可修改，并生成维护报告。确认归档 ${session.entries.length} 根音管记录？`)) {
      props.onArchive(session.id);
    }
  };

  const discard = () => {
    if (window.confirm("确定放弃本次草稿？已录入的数据将被删除。")) {
      props.onDiscard(session.id);
    }
  };

  const visibleEntries =
    filter === "全部" ? session.entries : session.entries.filter((e) => e.category === filter);

  return (
    <>
      <section className="panel session-head">
        <div className="heading">
          <div>
            <p>进行中 · {session.date}</p>
            <h2>{session.venueName}</h2>
          </div>
          <div className="head-actions">
            <span className="badge badge-draft">草稿</span>
            <button type="button" onClick={discard}>放弃草稿</button>
            <button
              className="primary"
              type="button"
              disabled={session.entries.length === 0}
              onClick={archive}
            >
              完成维护 · 归档并生成报告
            </button>
          </div>
        </div>
        <div className="session-stats">
          <span>已录入 <strong>{session.entries.length}</strong> 根</span>
          <span className={abnormalCount > 0 ? "text-danger" : ""}>
            异常 <strong>{abnormalCount}</strong> 根
          </span>
          {session.copiedFrom && <span className="hint">本次草稿复制自上次维护数据</span>}
        </div>
      </section>

      <section className="panel form-panel">
        <div className="heading">
          <div>
            <p>逐根录入</p>
            <h2>{editingId ? "编辑音管" : "新增音管"}</h2>
          </div>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>
              取消编辑
            </button>
          )}
        </div>
        <div className="field-grid">
          <label>
            <span>音栓（允许偏差 ±{stop?.toleranceCents ?? "—"} 音分）</span>
            <select value={form.stopId} onChange={(e) => onStopChange(e.target.value)}>
              {STOP_CATEGORIES.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {STOPS.filter((s) => s.category === cat).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}（±{s.toleranceCents}）
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            <span>音管编号</span>
            <input
              placeholder="如 T-037"
              value={form.pipeNo}
              onChange={(e) => setField("pipeNo", e.target.value)}
            />
          </label>
          <label>
            <span>音高</span>
            <input
              list="pitch-options"
              placeholder="如 C#4"
              value={form.pitch}
              onChange={(e) => setField("pitch", e.target.value)}
            />
            <datalist id="pitch-options">
              {PITCH_OPTIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label>
            <span>音分偏差（正为偏高）</span>
            <input
              type="number"
              step="1"
              value={form.cents}
              onChange={(e) => setField("cents", e.target.value)}
            />
          </label>
          <label>
            <span>温度（℃）</span>
            <input
              type="number"
              step="0.1"
              placeholder="如 21.5"
              value={form.temperature}
              onChange={(e) => setField("temperature", e.target.value)}
            />
          </label>
          <label>
            <span>湿度（%）</span>
            <input
              type="number"
              step="1"
              placeholder="如 55"
              value={form.humidity}
              onChange={(e) => setField("humidity", e.target.value)}
            />
          </label>
          <label>
            <span>簧片状态{stop && !stop.reed ? "（非簧片音栓）" : ""}</span>
            <select
              value={form.reedStatus}
              onChange={(e) => setField("reedStatus", e.target.value)}
            >
              {REED_STATUSES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            <span>维修备注</span>
            <input
              placeholder="如：簧片需微调"
              value={form.note}
              onChange={(e) => setField("note", e.target.value)}
            />
          </label>
        </div>
        <div className="form-actions">
          {previewAbnormal && (
            <span className="badge badge-danger">
              超出允许范围 ±{stop?.toleranceCents} 音分，将标记为异常
            </span>
          )}
          <button className="primary" type="button" onClick={submit}>
            {editingId ? "保存修改" : "添加音管"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>调音偏差表</p>
            <h2>本次录入（{visibleEntries.length}）</h2>
          </div>
          <div className="chips">
            {(["全部", ...STOP_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={filter === c ? "chip-active" : ""}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        {visibleEntries.length === 0 ? (
          <p className="hint">暂无记录，请在上方逐根录入音管。</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>音栓</th>
                  <th>音管编号</th>
                  <th>音高</th>
                  <th>偏差(cent)</th>
                  <th>允许范围</th>
                  <th>温度</th>
                  <th>湿度</th>
                  <th>簧片状态</th>
                  <th>备注</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((e, i) => {
                  const ab = displayAbnormal(e);
                  return (
                    <tr key={e.id} className={ab ? "row-abnormal" : ""}>
                      <td>{i + 1}</td>
                      <td>{e.stopName}</td>
                      <td>{e.pipeNo}</td>
                      <td>{e.pitch}</td>
                      <td className={ab ? "text-danger" : ""}>{fmtSigned(e.cents)}</td>
                      <td>±{e.toleranceCents}</td>
                      <td>{e.temperature === null ? "—" : `${e.temperature}℃`}</td>
                      <td>{e.humidity === null ? "—" : `${e.humidity}%`}</td>
                      <td>{e.reedStatus}</td>
                      <td>{e.note || "—"}</td>
                      <td>
                        <span className={`badge ${ab ? "badge-danger" : "badge-ok"}`}>
                          {ab ? "异常" : "正常"}
                        </span>
                      </td>
                      <td className="row-actions">
                        <button type="button" onClick={() => editEntry(e)}>编辑</button>
                        <button type="button" onClick={() => removeEntry(e.id)}>删除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
