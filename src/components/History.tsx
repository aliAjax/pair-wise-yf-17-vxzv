import type { Session } from "../types";

interface Props {
  sessions: Session[];
  onViewReport: (sessionId: string) => void;
}

export default function History({ sessions, onViewReport }: Props) {
  const archived = [...sessions]
    .filter((s) => s.status === "archived")
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>历史归档</p>
          <h2>已归档维护记录（{archived.length} 次）</h2>
        </div>
      </div>
      {archived.length === 0 ? (
        <p className="empty">暂无已归档的维护记录。</p>
      ) : (
        <div className="records">
          {archived.map((s, index) => {
            const abnormal = s.entries.filter((e) => e.abnormal).length;
            return (
              <article key={s.id}>
                <b>{String(archived.length - index).padStart(2, "0")}</b>
                <div>
                  <h3>
                    {s.venueName} · {s.date}
                  </h3>
                  <p>
                    录入 {s.entries.length} 根音管 ·{" "}
                    {abnormal > 0 ? (
                      <span className="text-danger">{abnormal} 根异常</span>
                    ) : (
                      "无异常"
                    )}
                  </p>
                </div>
                <button onClick={() => onViewReport(s.id)}>查看报告</button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
