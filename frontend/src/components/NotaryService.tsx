const resolutions = [
  {
    id: 'res-01',
    title: '이사회 의결서 - 임원 선임',
    version: 'v1.2',
    updatedAt: '2026-02-01',
    status: '사용중',
  },
  {
    id: 'res-02',
    title: '이사회 의결서 - 정관 변경',
    version: 'v1.0',
    updatedAt: '2026-01-12',
    status: '검토중',
  },
]

const notaryProcess = [
  { id: 'step-1', title: '의결서 확정', status: '완료', note: '법무팀 최종 확인' },
  { id: 'step-2', title: '서명/날인 수집', status: '진행중', note: '이사 2명 서명 대기' },
  { id: 'step-3', title: '공증 신청', status: '대기', note: '서류 일괄 제출 예정' },
  { id: 'step-4', title: '공증 완료', status: '대기', note: '공증 수령 후 등기 진행' },
]

const cautions = [
  '의결서 서명/날인 누락 시 공증 반려 위험이 큽니다.',
  '정관 변경이 포함되는 경우, 총회 의결 요건을 반드시 검토하세요.',
  '공증 완료 후 14일 이내 등기 반영이 필요합니다.'
]

const workflowSteps = [
  '안건 등록',
  '소집 통지(Email/SMS)',
  '회의록 작성',
  '서류 패키징'
]

const agendaItems = [
  { id: 'ag-01', title: '임원 선임', type: '일반' },
  { id: 'ag-02', title: '정관 변경', type: '정관 변경' }
]

const sealCertificateIssuedAt = '2025-11-01'

function isSealValid(issuedAt: string) {
  const issue = new Date(issuedAt)
  const threshold = new Date()
  threshold.setMonth(threshold.getMonth() - 3)
  return issue >= threshold
}

export default function NotaryService() {
  return (
    <div className="panel">
      <div className="grid-toolbar">
        <h2 className="section-title">공증 / 의결</h2>
        <div className="badge">공증 진행 1건</div>
      </div>

      <div className="split-grid">
        <div className="panel-inner">
          <h3 className="section-title">자동 공증 워크플로우</h3>
          <ol className="timeline">
            {workflowSteps.map((step) => (
              <li key={step}>
                <div className="status-chip active">진행</div>
                <div>
                  <strong>{step}</strong>
                  <div className="muted">자동화 단계</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel-inner">
          <h3 className="section-title">이사회 의결서 양식</h3>
          <div className="table">
            <div className="table-row table-header">
              <div>양식명</div>
              <div>버전</div>
              <div>최종 업데이트</div>
              <div>상태</div>
            </div>
            {resolutions.map((item) => (
              <div className="table-row" key={item.id}>
                <div><strong>{item.title}</strong></div>
                <div>{item.version}</div>
                <div>{item.updatedAt}</div>
                <div>{item.status}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="button">양식 다운로드</button>
            <button className="button secondary">신규 양식 등록</button>
          </div>
        </div>
      </div>

      <div className="split-grid" style={{ marginTop: 16 }}>
        <div className="panel-inner">
          <h3 className="section-title">공증 진행 상태</h3>
          <ul className="timeline">
            {notaryProcess.map((step) => (
              <li key={step.id}>
                <div className={`status-chip ${step.status === '완료' ? 'done' : step.status === '진행중' ? 'active' : ''}`}>
                  {step.status}
                </div>
                <div>
                  <strong>{step.title}</strong>
                  <div className="muted">{step.note}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel-inner">
          <h3 className="section-title">스마트 가이드</h3>
          <div className="table">
            <div className="table-row table-header">
              <div>안건</div>
              <div>유형</div>
              <div>가이드</div>
            </div>
            {agendaItems.map((item) => (
              <div className="table-row" key={item.id}>
                <div><strong>{item.title}</strong></div>
                <div>{item.type}</div>
                <div>{item.type === '정관 변경' ? '인감도장 날인 필수' : '-'}</div>
              </div>
            ))}
          </div>
          <div className="alert-box" style={{ marginTop: 12 }}>
            <strong>인감증명서 유효성</strong>
            <p className="muted">
              발급일 {sealCertificateIssuedAt} · {isSealValid(sealCertificateIssuedAt) ? '유효' : '재발급 필요'}
            </p>
          </div>
        </div>
      </div>

      <div className="panel-inner">
        <h3 className="section-title">주의사항</h3>
        <ul className="checklist">
          {cautions.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
