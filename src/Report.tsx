import type { Session } from "./data";
import {
  abnormalEntries,
  displayAbnormal,
  fmtDateTime,
  fmtSigned,
  humidityRange,
  suggestionsFor,
  tempRange,
} from "./logic";

interface ReportProps {
  session: Session;
  onBack: () => void;
  onCopyToNew: (session: Session) => void;
}

/** 单次维护报告页：归档快照，只读 */
export function Report({ session, onBack, onCopyToNew }: ReportProps) {
  const abnormals = abnormalEntries(session);
  const archived = session.status === "archived";

  return (
    <div className="report">
      <section className="panel report-head">
        <div className="heading">
          <div>
            <p>单次维护报告 · {session.date}</p>
            <h2>{session.venueName}</h2>
          </div>
          <div className="head-actions">
            <span className={`badge ${archived ? "badge-ok" : "badge-draft"}`}>
              {archived ? "已归档" : "草稿预览"}
            </span>
            <button type="button" onClick={() => window.print()}>打印报告</button>
            <button type="button" onClick={() => onCopyToNew(session)}>
              以此创建下次维护草稿
            </button>
            <button type="button" onClick={onBack}>返回</button>
          </div>
        </div>
        <div className="session-stats">
          <span>维护日期 <strong>{session.date}</strong></span>
          <span>归档时间 <strong>{fmtDateTime(session.archivedAt)}</strong></span>
          <span>录入音管 <strong>{session.entries.length}</strong> 根</span>
          <span className={abnormals.length > 0 ? "text-danger" : ""}>
            异常音管 <strong>{abnormals.length}</strong> 根
          </span>
          <span>温度 <strong>{tempRange(session)}</strong></span>
          <span>湿度 <strong>{humidityRange(session)}</strong></span>
        </div>
        {session.copiedFrom && (
          <p className="hint">本次维护草稿复制自上次维护数据，归档内容以本次实际录入为准。</p>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>异常汇总</p>
            <h2>异常音管与处理建议（{abnormals.length}）</h2>
          </div>
        </div>
        {abnormals.length === 0 ? (
          <p className="ok-line">本次维护无超限音管，全部在允许偏差范围内。</p>
        ) : (
          <div className="abnormal-list">
            {abnormals.map((e) => (
              <article key={e.id} className="abnormal-card">
                <header>
                  <strong>{e.stopName} · {e.pipeNo} · {e.pitch}</strong>
                  <span className="badge badge-danger">
                    偏差 {fmtSigned(e.cents)} cent（允许 ±{e.toleranceCents}）
                  </span>
                </header>
                <ul>
                  {suggestionsFor(e).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                {e.note && <p className="hint">现场备注：{e.note}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>归档快照</p>
            <h2>全部录入明细（{session.entries.length}）</h2>
          </div>
        </div>
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
              </tr>
            </thead>
            <tbody>
              {session.entries.map((e, i) => {
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
