import { useMemo, useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api'
const API_URL = `${API_BASE}/board-members`

const executiveTypes = ['이사', '감사', '대표이사']

type ApiBoardMember = {
  id: string
  name: string
  address: string
  term_start: string
  term_end: string
  occupation: string
  role: string
  is_foreigner: boolean
  special_relation_to_id: string | null
  rrn_key_id: string
}

type Executive = {
  id: string
  name: string
  role: string
  termStart: string
  termEnd: string
  registrationDue: string
  status: string
  contact?: string
  address?: string
  note?: string
  occupation?: string
  isForeigner?: boolean
}

const initialChangeHistory = [
  {
    id: 'chg-01',
    date: '2026-02-01',
    executive: '김현수',
    type: '선임',
    note: '임기 갱신 및 대표이사 재선임',
  },
]

const requiredDocs = [
  { id: 'doc-01', title: '이사회 의사록 (선임/사임 결의)' },
  { id: 'doc-02', title: '취임승낙서 / 사임서' },
  { id: 'doc-03', title: '인감증명서 및 주민등록등본' },
  { id: 'doc-04', title: '정관 변경 필요 여부 확인' },
]

export default function ExecutiveManagement() {
  const [executives, setExecutives] = useState<Executive[]>([])
  const [changeHistory, setChangeHistory] = useState(initialChangeHistory)
  const [filterRole, setFilterRole] = useState('전체')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'term' | 'status'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newExecutive, setNewExecutive] = useState({
    name: '',
    role: '이사',
    termStart: '',
    termEnd: '',
    status: '재직',
    contact: '',
    address: '',
    note: '',
    rrn: '',
    occupation: '',
    isForeigner: false,
  })
  const [requirements, setRequirements] = useState({
    ceo: 1,
    director: 3,
    auditor: 1,
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsUnlocked, setSettingsUnlocked] = useState(false)
  const [settingsNoticeOpen, setSettingsNoticeOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<Executive | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // 1. 초기 데이터 로드
  useEffect(() => {
    fetchExecutives()
  }, [])

  const mapApiToExecutive = (item: ApiBoardMember): Executive => {
    const termEnd = item.term_end
    return {
      id: item.id,
      name: item.name,
      role: item.role,
      termStart: item.term_start,
      termEnd,
      registrationDue: new Date(new Date(termEnd).getTime() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      status: '재직',
      contact: '',
      address: item.address,
      note: '',
      occupation: item.occupation,
      isForeigner: item.is_foreigner,
    }
  }

  const fetchExecutives = async () => {
    setLoading(true)
    try {
      const response = await fetch(API_URL)
      if (!response.ok) throw new Error('데이터를 불러오는데 실패했습니다.')
      const data: ApiBoardMember[] = await response.json()
      setExecutives(data.map(mapApiToExecutive))
    } catch (err: any) {
      setError(err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const filteredItems = executives.filter((ex) => {
      const roleOk = filterRole === '전체' || ex.role === filterRole
      const searchOk = ex.name.includes(search.trim())
      return roleOk && (search.trim() ? searchOk : true)
    })
    const statusPriority: Record<string, number> = {
      '재직': 1,
      '중임예정': 2,
      '선임예정': 3,
      '사임예정': 4,
      '사임': 5,
      '퇴임': 6,
    }
    return filteredItems.sort((a, b) => {
      let result = 0
      if (sortKey === 'name') {
        result = a.name.localeCompare(b.name, 'ko')
      } else if (sortKey === 'term') {
        result = a.termStart.localeCompare(b.termStart)
      } else if (sortKey === 'status') {
        result = (statusPriority[a.status] ?? 999) - (statusPriority[b.status] ?? 999)
      }
      return sortOrder === 'asc' ? result : -result
    })
  }, [executives, filterRole, search, sortKey, sortOrder])

  const activeExecutives = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return executives.filter((ex) => {
      const withinTerm = ex.termStart <= today && ex.termEnd >= today
      if (!withinTerm) return false
      if (ex.status === '사임' || ex.status === '퇴임') return false
      if (ex.status === '선임예정' && ex.termStart > today) return false
      return true
    })
  }, [executives])

  const counts = useMemo(() => {
    return {
      ceo: activeExecutives.filter((ex) => ex.role === '대표이사').length,
      director: activeExecutives.filter((ex) => ex.role === '이사').length,
      auditor: activeExecutives.filter((ex) => ex.role === '감사').length,
    }
  }, [activeExecutives])

  const completion = useMemo(() => {
    const items = [
      { current: counts.ceo, required: requirements.ceo },
      { current: counts.director, required: requirements.director },
      { current: counts.auditor, required: requirements.auditor },
    ]
    const totalRequired = items.reduce((sum, item) => sum + item.required, 0)
    if (!totalRequired) return 100
    const totalCurrent = items.reduce((sum, item) => sum + Math.min(item.current, item.required), 0)
    return Math.round((totalCurrent / totalRequired) * 100)
  }, [counts, requirements])

  // 2. 신규 임원 추가 (POST)
  const handleAddExecutive = async () => {
    setAddError(null)
    if (!newExecutive.termStart || !newExecutive.termEnd) {
      setAddError('필수값이 누락되었습니다. 임기를 확인하세요.')
      return
    }
    if (!newExecutive.name) {
      setAddError('성명을 입력하세요.')
      return
    }
    if (!newExecutive.rrn || newExecutive.rrn.length < 6) {
      setAddError('주민등록번호를 입력하세요.')
      return
    }
    if (!newExecutive.address) {
      setAddError('주소를 입력하세요.')
      return
    }
    if (!newExecutive.occupation) {
      setAddError('직업을 입력하세요.')
      return
    }

    try {
      const payload = {
        name: newExecutive.name,
        rrn: newExecutive.rrn,
        address: newExecutive.address,
        term_start: newExecutive.termStart,
        term_end: newExecutive.termEnd,
        occupation: newExecutive.occupation,
        role: newExecutive.role,
        is_foreigner: newExecutive.isForeigner,
        special_relation_to_id: null,
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('저장에 실패했습니다.')
      
      const savedItem: ApiBoardMember = await response.json()
      const savedExecutive = { ...mapApiToExecutive(savedItem), status: newExecutive.status }
      setExecutives((prev) => [...prev, savedExecutive])
      
      // 히스토리 추가 (프런트엔드 우선)
      const typeByStatus: Record<string, string> = {
        '재직': '신규선임',
        '선임예정': '신규선임',
        '중임예정': '중임',
        '사임예정': '퇴임',
        '사임': '퇴임',
        '퇴임': '퇴임',
      }
      setChangeHistory((prev) => [
        {
          id: `chg-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          executive: savedExecutive.name,
          type: typeByStatus[newExecutive.status] ?? '신규선임',
          note: `신규 임원 추가 (${newExecutive.status})`,
        },
        ...prev,
      ])

      setNewExecutive({
        name: '',
        role: '이사',
        termStart: '',
        termEnd: '',
        status: '재직',
        contact: '',
        address: '',
        note: '',
        rrn: '',
        occupation: '',
        isForeigner: false,
      })
      setAddOpen(false)
    } catch (err: any) {
      setAddError(err.message)
    }
  }

  const handleOpenAdd = () => {
    setAddError(null)
    setAddOpen(true)
  }

  const handleOpenSettings = () => {
    setSettingsOpen(true)
    setSettingsUnlocked(false)
    setSettingsNoticeOpen(false)
  }

  const handleConfirmSettings = () => {
    setSettingsUnlocked(true)
    setSettingsNoticeOpen(true)
  }

  const handleOpenEdit = (ex: Executive) => {
    setEditForm({ ...ex })
    setEditOpen(true)
  }

  // 3. 임원 정보 수정 (PATCH)
  const handleSaveEdit = async () => {
    if (!editForm) return
    const before = executives.find((ex) => ex.id === editForm.id)
    
    try {
      const updatedData = {
        name: editForm.name,
        address: editForm.address,
        term_start: editForm.termStart,
        term_end: editForm.termEnd,
        occupation: editForm.occupation,
        role: editForm.role,
        is_foreigner: editForm.isForeigner,
        special_relation_to_id: null,
      }

      const response = await fetch(`${API_URL}/${editForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      })

      if (!response.ok) throw new Error('수정에 실패했습니다.')
      
      const savedUpdated: ApiBoardMember = await response.json()
      const mappedUpdated = {
        ...mapApiToExecutive(savedUpdated),
        status: editForm.status,
        contact: editForm.contact,
        note: editForm.note,
      }
      setExecutives((prev) => prev.map((ex) => (ex.id === editForm.id ? mappedUpdated : ex)))
      
      // 히스토리 추가
      const statusTypeMap: Record<string, string> = {
        '재직': '정보변경',
        '선임예정': '신규선임',
        '중임예정': '중임',
        '사임예정': '퇴임',
        '사임': '퇴임',
        '퇴임': '퇴임',
      }
      const statusChanged = before?.status !== editForm.status
      const type = statusChanged ? (statusTypeMap[editForm.status] ?? '정보변경') : '정보변경'
      const note = statusChanged ? `상태 변경 (${before?.status ?? '-'} → ${editForm.status})` : '기본정보 수정'
      
      setChangeHistory((prev) => [
        {
          id: `chg-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          executive: mappedUpdated.name,
          type,
          note,
        },
        ...prev,
      ])
      
      setEditOpen(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) return <div className="panel">데이터를 불러오는 중...</div>
  if (error) return <div className="panel">오류 발생: {error}</div>

  return (
    <div className="panel">
      {/* (생략: 기존 UI 구성요소 동일) */}
      <div className="grid-toolbar">
        <h2 className="section-title">임원 관리</h2>
        <div className="badge">등기 기한 임박 2건</div>
      </div>

      <div className="panel-inner" style={{ marginBottom: 16 }}>
        <div className="grid-toolbar">
          <h3 className="section-title">법정 필수 임원 구성 가이드</h3>
          <button className="button secondary" onClick={handleOpenSettings}>임원설정</button>
        </div>
        <div className="alert-box" style={{ marginBottom: 12 }}>
          <strong>가이드라인</strong>
          <p className="muted">
            이사 최소 5명~최대 15명, 감사 최소 2명 기준을 충족해야 합니다. 특수관계인 이사가 전체 이사의 1/5을
            초과하면 경고되며, 외국인 이사가 1/2을 초과하면 제한됩니다.
          </p>
        </div>
        <div className="form-row" style={{ flexWrap: 'wrap' }}>
          <div className="inline-field">대표이사 최소 {requirements.ceo}명</div>
          <div className="inline-field">이사 최소 {requirements.director}명</div>
          <div className="inline-field">감사 최소 {requirements.auditor}명</div>
        </div>
        <div className="guide-bar">
          <div className="guide-progress" style={{ width: `${completion}%` }} />
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          대표이사 {counts.ceo}/{requirements.ceo} · 이사 {counts.director}/{requirements.director} · 감사 {counts.auditor}/{requirements.auditor} · 충족률 {completion}%
        </div>
      </div>

      {settingsOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>구성 가이드 설정</h3>
            <p className="muted" style={{ marginTop: 6 }}>
              법적 근거에 맞게 임원 인원을 설정해주세요.
            </p>
            {settingsNoticeOpen && (
              <div className="alert-box" style={{ marginTop: 12 }}>
                <strong>안내</strong>
                <p className="muted">
                  변경이 반영되었습니다. 임원 구성 기준을 조정할 수 있습니다. 예: 대표이사 1명 · 이사 00명 · 감사 00명
                </p>
              </div>
            )}
            <div className="form-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <label className="inline-field">
                대표이사 최소
                <input
                  type="number"
                  min={0}
                  value={requirements.ceo}
                  onChange={(e) => setRequirements((prev) => ({ ...prev, ceo: Number(e.target.value) }))}
                  disabled={!settingsUnlocked}
                />
              </label>
              <label className="inline-field">
                이사 최소
                <input
                  type="number"
                  min={0}
                  value={requirements.director}
                  onChange={(e) => setRequirements((prev) => ({ ...prev, director: Number(e.target.value) }))}
                  disabled={!settingsUnlocked}
                />
              </label>
              <label className="inline-field">
                감사 최소
                <input
                  type="number"
                  min={0}
                  value={requirements.auditor}
                  onChange={(e) => setRequirements((prev) => ({ ...prev, auditor: Number(e.target.value) }))}
                  disabled={!settingsUnlocked}
                />
              </label>
            </div>
            <div className="panel-inner" style={{ marginTop: 12 }}>
              <h4 className="section-title">법적 근거</h4>
              <ul className="checklist">
                <li>공익법인 회계기준 및 관련 주무관청 지침</li>
                <li>정관의 임원 구성 규정 (이사/감사 최소 인원)</li>
                <li>상법 및 민법상 법인 임원 요건 (법인 유형에 따라 상이)</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="button" onClick={handleConfirmSettings}>변경</button>
              <button className="button secondary" onClick={() => setSettingsOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid-toolbar" style={{ marginTop: 4 }}>
        <h3 className="section-title">임원 명단</h3>
        <button className="button" onClick={handleOpenAdd}>신규 임원 추가</button>
      </div>

      <div className="form-row">
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="전체">전체 임원</option>
          {executiveTypes.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="임원명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as 'name' | 'term' | 'status')}>
          <option value="name">성명</option>
          <option value="term">임기</option>
          <option value="status">상태</option>
        </select>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}>
          <option value="asc">오름차순</option>
          <option value="desc">내림차순</option>
        </select>
      </div>

      <div className="table">
        <div className="table-row table-header">
          <div>성명</div>
          <div>구분</div>
          <div>임기</div>
          <div>등기기한</div>
          <div>상태</div>
          <div>연락처</div>
          <div>주소</div>
          <div>비고</div>
        </div>
        {filtered.map((ex) => {
            const today = new Date().toISOString().slice(0, 10)
            const isExpired = ex.termEnd < today && ex.status !== '사임' && ex.status !== '퇴임'
            const warningStyle = isExpired ? { color: '#b91c1c', fontWeight: 600 } : undefined
            const warningTitle = isExpired ? '임기 만료됨: 상태를 사임 또는 퇴임으로 변경해주세요.' : undefined
            return (
              <div className="table-row" key={ex.id}>
                <div>
                  <strong>{ex.name}</strong>
                  <button
                    type="button"
                    className="button secondary"
                    style={{ marginLeft: 8, padding: '2px 8px' }}
                    onClick={() => handleOpenEdit(ex)}
                  >
                    변경
                  </button>
                </div>
                <div>{ex.role}</div>
                <div style={warningStyle} title={warningTitle}>{ex.termStart} ~ {ex.termEnd}</div>
                <div>{ex.registrationDue}</div>
                <div style={warningStyle} title={warningTitle}>{ex.status}</div>
                <div>{ex.role === '이사' ? ex.contact || '-' : '-'}</div>
                <div>{ex.role === '이사' ? ex.address || '-' : '-'}</div>
                <div>{ex.role === '이사' ? ex.note || '-' : '-'}</div>
              </div>
            )
        })}
      </div>

      {editOpen && editForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>임원 기본정보 수정</h3>
            <p className="muted" style={{ marginTop: 6 }}>
              임기, 상태, 연락처 등 기본정보를 수정할 수 있습니다.
            </p>
            <div className="form-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="성명"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
              />
              <select
                value={editForm.role}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, role: e.target.value } : prev))}
              >
                {executiveTypes.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="직업"
                value={editForm.occupation ?? ''}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, occupation: e.target.value } : prev))}
              />
              <input
                type="date"
                value={editForm.termStart}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, termStart: e.target.value } : prev))}
              />
              <input
                type="date"
                value={editForm.termEnd}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, termEnd: e.target.value } : prev))}
              />
              <label className="inline-field" style={{ alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={editForm.isForeigner ?? false}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, isForeigner: e.target.checked } : prev))}
                />
                외국인 여부
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, status: e.target.value } : prev))}
              >
                <option value="재직">재직</option>
                <option value="중임예정">중임예정</option>
                <option value="사임">사임</option>
                <option value="선임예정">선임예정</option>
                <option value="사임예정">사임예정</option>
                <option value="퇴임">퇴임</option>
              </select>
              <input
                type="text"
                placeholder="연락처"
                value={editForm.contact ?? ''}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, contact: e.target.value } : prev))}
              />
              <input
                type="text"
                placeholder="주소"
                value={editForm.address ?? ''}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, address: e.target.value } : prev))}
              />
              <input
                type="text"
                placeholder="비고"
                value={editForm.note ?? ''}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, note: e.target.value } : prev))}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="button" onClick={handleSaveEdit}>저장</button>
              <button className="button secondary" onClick={() => setEditOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>신규 임원 추가</h3>
            <p className="muted" style={{ marginTop: 6 }}>
              필수값: 성명, 주민등록번호, 주소, 직업, 임기
            </p>
            <div className="form-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="성명"
                value={newExecutive.name}
                onChange={(e) => setNewExecutive((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                type="text"
                placeholder="주민등록번호"
                value={newExecutive.rrn}
                onChange={(e) => setNewExecutive((prev) => ({ ...prev, rrn: e.target.value }))}
              />
              <select
                value={newExecutive.role}
                onChange={(e) => setNewExecutive((prev) => ({ ...prev, role: e.target.value }))}
              >
                {executiveTypes.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="직업"
                value={newExecutive.occupation}
                onChange={(e) => setNewExecutive((prev) => ({ ...prev, occupation: e.target.value }))}
              />
              <input
                type="date"
                value={newExecutive.termStart}
                onChange={(e) => setNewExecutive((prev) => ({ ...prev, termStart: e.target.value }))}
              />
              <input
                type="date"
                value={newExecutive.termEnd}
                onChange={(e) => setNewExecutive((prev) => ({ ...prev, termEnd: e.target.value }))}
              />
              <label className="inline-field" style={{ alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={newExecutive.isForeigner}
                  onChange={(e) => setNewExecutive((prev) => ({ ...prev, isForeigner: e.target.checked }))}
                />
                외국인 여부
              </label>
              <input
                type="text"
                placeholder="연락처"
                value={newExecutive.contact}
                onChange={(e) => setNewExecutive((prev) => ({ ...prev, contact: e.target.value }))}
              />
              <input
                type="text"
                placeholder="주소"
                value={newExecutive.address}
                onChange={(e) => setNewExecutive((prev) => ({ ...prev, address: e.target.value }))}
              />
              <input
                type="text"
                placeholder="비고"
                value={newExecutive.note}
                onChange={(e) => setNewExecutive((prev) => ({ ...prev, note: e.target.value }))}
              />
              <select
                value={newExecutive.status}
                onChange={(e) => setNewExecutive((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="재직">재직</option>
                <option value="중임예정">중임예정</option>
                <option value="사임">사임</option>
                <option value="선임예정">선임예정</option>
                <option value="사임예정">사임예정</option>
                <option value="퇴임">퇴임</option>
              </select>
            </div>
            {addError && (
              <div className="alert-box" style={{ marginTop: 12 }}>
                <strong>추가 불가</strong>
                <p className="muted">{addError}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="button" onClick={handleAddExecutive}>추가</button>
              <button className="button secondary" onClick={() => setAddOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      <div className="split-grid" style={{ marginTop: 24 }}>
        <div className="panel-inner">
          <h3 className="section-title">변경 이력</h3>
          <ul className="timeline">
            {changeHistory.map((item) => (
              <li key={item.id}>
                <div className="timeline-date">{item.date}</div>
                <div>
                  <strong>{item.executive}</strong> · {item.type}
                  <div className="muted">{item.note}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel-inner">
          <h3 className="section-title">선임/사임 필수 서류</h3>
          <ul className="checklist">
            {requiredDocs.map((doc) => (
              <li key={doc.id}>{doc.title}</li>
            ))}
          </ul>
          <div className="alert-box">
            <strong>알림</strong>
            <p className="muted">등기 기한은 변경일로부터 14일 이내 등록이 원칙입니다. 내부 승인 완료 후 바로 서류 제출을 준비하세요.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
