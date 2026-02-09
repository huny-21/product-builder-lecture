import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const budgetData = [
  { name: '집행', value: 68 },
  { name: '잔여', value: 32 }
]

const ratioData = [
  { name: '공익', value: 60 },
  { name: '수익', value: 40 }
]

const taxSchedule = [
  { title: '원천세 신고', date: '2026-02-10' },
  { title: '부가세 예정신고', date: '2026-02-25' },
  { title: '연말정산 제출', date: '2026-03-05' }
]

const boardTerms = [
  { name: '김현수', role: '대표이사', termEnd: '2026-03-15' },
  { name: '박지은', role: '이사', termEnd: '2026-04-10' },
  { name: '최민석', role: '감사', termEnd: '2026-05-01' }
]

const sealCertificates = [
  { id: 'seal-01', issuedAt: '2025-11-15', owner: '공익법인 인감증명서' },
  { id: 'seal-02', issuedAt: '2026-01-20', owner: '대표이사 인감증명서' }
]

function dday(target: string) {
  const today = new Date()
  const t = new Date(target)
  const diff = Math.ceil((t.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? `D-${diff}` : `D+${Math.abs(diff)}`
}

function isExpiringSoon(target: string) {
  const today = new Date()
  const t = new Date(target)
  const diff = Math.ceil((t.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return [90, 60, 30].includes(diff)
}

function isSealValid(issuedAt: string) {
  const issue = new Date(issuedAt)
  const threshold = new Date()
  threshold.setMonth(threshold.getMonth() - 3)
  return issue >= threshold
}

export default function Dashboard() {
  return (
    <div className="panel">
      <div className="grid-toolbar">
        <h2 className="section-title">대시보드</h2>
        <div className="badge">미결재 전표 6건</div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <strong>예산 집행률</strong>
          <div style={{ width: '100%', height: 140 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={budgetData} dataKey="value" innerRadius={45} outerRadius={65} startAngle={180} endAngle={0} paddingAngle={2}>
                  <Cell fill="#0f5d4a" />
                  <Cell fill="#d9e2d0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>68% 집행</div>
        </div>

        <div className="kpi-card">
          <strong>공익 vs 수익 비중</strong>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={ratioData} dataKey="value" outerRadius={70}>
                  <Cell fill="#0f5d4a" />
                  <Cell fill="#99b57a" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>공익 60% / 수익 40%</div>
        </div>

        <div className="kpi-card">
          <strong>이달의 세무 일정</strong>
          <ul style={{ paddingLeft: 18, margin: '8px 0', color: 'var(--muted)' }}>
            {taxSchedule.map((item) => (
              <li key={item.title}>
                {item.title} · {item.date} · {dday(item.date)}
              </li>
            ))}
          </ul>
        </div>

        <div className="kpi-card">
          <strong>미결재 전표</strong>
          <div style={{ fontSize: 28, fontWeight: 700 }}>6</div>
          <div style={{ color: 'var(--muted)' }}>승인 대기 중</div>
        </div>

        <div className="kpi-card">
          <strong>임기 만료 알림</strong>
          <ul style={{ paddingLeft: 18, margin: '8px 0', color: 'var(--muted)' }}>
            {boardTerms.map((item) => (
              <li key={`${item.name}-${item.termEnd}`}>
                {item.name} ({item.role}) · {item.termEnd} · {dday(item.termEnd)}
                {isExpiringSoon(item.termEnd) && (
                  <span style={{ marginLeft: 8, color: '#b45309' }}>임박</span>
                )}
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <button className="button secondary">중임</button>
                  <button className="button secondary">퇴임</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="kpi-card">
          <strong>인감증명서 유효성</strong>
          <ul style={{ paddingLeft: 18, margin: '8px 0', color: 'var(--muted)' }}>
            {sealCertificates.map((item) => {
              const valid = isSealValid(item.issuedAt)
              return (
                <li key={item.id}>
                  {item.owner} · 발급일 {item.issuedAt} · {valid ? '유효' : '재발급 필요'}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
