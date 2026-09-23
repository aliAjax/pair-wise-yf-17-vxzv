import type { Session } from "./data";
import { abnormalEntries, fmtDateTime } from "./logic";

interface ArchiveProps {
  sessions: Session[];
  onOpenReport: (id: string) => void;
  onContinueDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
}

/** 归档记录列表：历史报告可回看，草稿可继续 */
export function Archive({ sessions, onOpenReport, onContinueDraft, onDeleteDraft }: ArchiveProps) {
  const archived = sessions
    .filter((s) => s.status === "archived")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const drafts = sessions
    .filter((s) => s.status === "draft")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <>
      {drafts.length > 0 && (
        <section className="panel">
          <div className="heading">
            <div>
              <p>未完成</p>
              <h2>草稿（{drafts.length}）</h2>
            </div>
          </div>
          <div className="records">
            {drafts.map((s) => (
              <article key={s.id}>
                <b>{s.entries.length}</b>
                <div>
                  <h3>
                    {s.venueName} · {s.date}
                    <span className="badge badge-draft">草稿</span>
                  </h3>
                  <p>
                    已录入 {s.entries.length} 根音管 · 创建于 {fmtDateTime(s.createdAt)}
                    {s.copiedFrom ? " · 复制自上次维护" : ""}
                  </p>
                  <div className="record-actions">
                    <button type="button" className="primary" onClick={() => onContinueDraft(s.id)}>
                      继续录入
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("确定删除该草稿？")) onDeleteDraft(s.id);
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="heading">
          <div>
            <p>历史归档</p>
            <h2>已归档维护（{archived.length}）</h2>
          </div>
        </div>
        {archived.length === 0 ? (
          <p className="hint">暂无归档记录，完成一次维护并归档后会出现在这里。</p>
        ) : (
          <div className="records">
            {archived.map((s) => {
              const ab = abnormalEntries(s).length;
              return (
                <article key={s.id}>
                  <b>{String(s.entries.length).padStart(2, "0")}</b>
                  <div>
                    <h3>
                      {s.venueName} · {s.date}
                      <span className={`badge ${ab > 0 ? "badge-danger" : "badge-ok"}`}>
                        {ab > 0 ? `异常 ${ab}` : "全部正常"}
                      </span>
                    </h3>
                    <p>
                      录入 {s.entries.length} 根音管 · 归档于 {fmtDateTime(s.archivedAt)}
                    </p>
                    <div className="record-actions">
                      <button type="button" onClick={() => onOpenReport(s.id)}>
                        查看报告
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
