import type { Session } from "../types";
import { ENV_RANGE } from "../types";
import { adviceFor, envSummary, formatCent } from "../advice";

interface Props {
  session: Session | null;
  onCopyToNewDraft: (session: Session) => void;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function Report({ session, onCopyToNewDraft }: Props) {
  if (!session) {
    return (
      <section className="panel">
        <p className="empty">暂无报告。在工作台完成维护并归档后，会自动生成本次维护报告。</p>
      </section>
    );
  }

  const abnormalEntries = session.entries.filter((e) => e.abnormal);
  const stopCount = new Set(session.entries.map((e) => e.stopId)).size;
  const { avgTemp, avgHumidity } = envSummary(session.entries);
  const tempOut =
    avgTemp !== null &&
    (avgTemp < ENV_RANGE.temperature.min || avgTemp > ENV_RANGE.temperature.max);
  const humOut =
    avgHumidity !== null &&
    (avgHumidity < ENV_RANGE.humidity.min || avgHumidity > ENV_RANGE.humidity.max);

  return (
    <div className="report">
      <section className="panel report-head">
        <div className="heading">
          <div>
            <p>单次维护报告</p>
            <h2>
              {session.venueName} · {session.date}
            </h2>
            <p className="meta">
              工单号 {session.id} · 归档时间 {formatTime(session.archivedAt)}
            </p>
          </div>
          <div className="report-actions">
            <button onClick={() => window.print()}>打印报告</button>
            <button className="primary" onClick={() => onCopyToNewDraft(session)}>
              据此新建下次维护草稿
            </button>
          </div>
        </div>
      </section>

      <section className="metrics">
        <article>
          <small>录入音管</small>
          <strong>{session.entries.length}</strong>
        </article>
        <article>
          <small>涉及音栓</small>
          <strong>{stopCount}</strong>
        </article>
        <article className={abnormalEntries.length > 0 ? "metric-danger" : ""}>
          <small>异常音管</small>
          <strong>{abnormalEntries.length}</strong>
        </article>
        <article>
          <small>平均温湿度</small>
          <strong className="metric-small">
            {avgTemp === null ? "—" : `${avgTemp}℃`} /{" "}
            {avgHumidity === null ? "—" : `${avgHumidity}%`}
          </strong>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>异常汇总</p>
            <h2>异常音管与处理建议</h2>
          </div>
        </div>
        {abnormalEntries.length === 0 ? (
          <p className="empty">本次维护未发现超限音管，全部在允许范围内。</p>
        ) : (
          <div className="advice-list">
            {abnormalEntries.map((e) => (
              <article key={e.id} className="advice-card">
                <header>
                  <strong>
                    {e.stopName} · {e.pipeNo} · {e.pitch}
                  </strong>
                  <span className="badge danger">
                    {formatCent(e.centDeviation)} 音分 / 允许 ±{e.tolerance}
                  </span>
                </header>
                <ul>
                  {adviceFor(e).map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
                {e.note ? <p className="meta">现场备注：{e.note}</p> : null}
              </article>
            ))}
          </div>
        )}
        {tempOut || humOut ? (
          <p className="judge abnormal">
            环境提示：本次平均温度 {avgTemp ?? "—"}℃、平均湿度 {avgHumidity ?? "—"}%，超出适宜区间（
            {ENV_RANGE.temperature.min}–{ENV_RANGE.temperature.max}℃、
            {ENV_RANGE.humidity.min}–{ENV_RANGE.humidity.max}%），建议关注场馆温湿度对音准的影响。
          </p>
        ) : null}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>归档快照</p>
            <h2>全部录入明细（{session.entries.length} 条）</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>音栓</th>
                <th>类别</th>
                <th>音管编号</th>
                <th>音高</th>
                <th>偏差(音分)</th>
                <th>允许范围</th>
                <th>温度</th>
                <th>湿度</th>
                <th>簧片状态</th>
                <th>备注</th>
                <th>判定</th>
              </tr>
            </thead>
            <tbody>
              {session.entries.map((e) => (
                <tr key={e.id} className={e.abnormal ? "row-abnormal" : ""}>
                  <td>{e.stopName}</td>
                  <td>{e.category}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
