import { useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridApi } from 'ag-grid-community'
import Modal from './Modal'
import FileDropzone from './FileDropzone'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

type AccountOption = {
  id: string
  name: string
  isCommonExpense: boolean
  categoryMain: string
  categoryMid: string
  categorySub: string
}

type Row = {
  id: string
  accountId: string
  categoryMain: string
  categoryMid: string
  categorySub: string
  fundingSource: string
  debit: number
  credit: number
  project: string
  evidenceFiles: string[]
}

const accountOptions: AccountOption[] = [
  { id: 'rent', name: '임차료', isCommonExpense: true, categoryMain: '운영비', categoryMid: '관리비', categorySub: '임차료' },
  { id: 'salary', name: '인건비', isCommonExpense: false, categoryMain: '운영비', categoryMid: '인건비', categorySub: '급여' },
  { id: 'supplies', name: '소모품비', isCommonExpense: true, categoryMain: '운영비', categoryMid: '관리비', categorySub: '소모품비' },
  { id: 'donation', name: '기부금수익', isCommonExpense: false, categoryMain: '수익', categoryMid: '기부금수익', categorySub: '일반기부금' }
]

const fundingSourceOptions = [
  { id: 'donation', name: '후원금' },
  { id: 'gov', name: '정부보조금' },
  { id: 'self', name: '자체수익' },
  { id: 'corp', name: '법인전입' },
  { id: 'other', name: '기타' }
]

const parseCsv = (text: string) => {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  const row: string[] = []

  const pushValue = () => {
    row.push(current)
    current = ''
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && char === ',') {
      pushValue()
      continue
    }
    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1
      pushValue()
      rows.push([...row])
      row.length = 0
      continue
    }
    current += char
  }

  pushValue()
  if (row.length) rows.push([...row])
  return rows
}

const csvEscape = (value: string | number) => {
  const text = String(value ?? '')
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export default function SmartJournalEntryForm() {
  const [rows, setRows] = useState<Row[]>([
    {
      id: '1',
      accountId: 'rent',
      categoryMain: '운영비',
      categoryMid: '관리비',
      categorySub: '임차료',
      fundingSource: 'self',
      debit: 1000000,
      credit: 0,
      project: '공익',
      evidenceFiles: []
    },
    {
      id: '2',
      accountId: 'donation',
      categoryMain: '수익',
      categoryMid: '기부금수익',
      categorySub: '일반기부금',
      fundingSource: 'donation',
      debit: 0,
      credit: 500000,
      project: '공익',
      evidenceFiles: []
    }
  ])
  const [gridApi, setGridApi] = useState<GridApi | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingCommonRowId, setPendingCommonRowId] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<'append' | 'overwrite'>('append')
  const [allocationRatio, setAllocationRatio] = useState(60)
  const [draft, setDraft] = useState<Row>({
    id: 'draft',
    accountId: '',
    categoryMain: '',
    categoryMid: '',
    categorySub: '',
    fundingSource: '',
    debit: 0,
    credit: 0,
    project: '공익',
    evidenceFiles: []
  })

  const columnDefs = useMemo<ColDef<Row>[]>(() => [
    { field: 'project', headerName: '프로젝트', editable: true },
    { field: 'categoryMain', headerName: '관', editable: false },
    { field: 'categoryMid', headerName: '항', editable: false },
    { field: 'categorySub', headerName: '목', editable: false },
    {
      field: 'accountId',
      headerName: '계정과목',
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: accountOptions.map((o) => o.id) },
      valueFormatter: (p) => accountOptions.find((o) => o.id === p.value)?.name || p.value
    },
    {
      field: 'fundingSource',
      headerName: '재원',
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: fundingSourceOptions.map((o) => o.id) },
      valueFormatter: (p) => fundingSourceOptions.find((o) => o.id === p.value)?.name || p.value
    },
    { field: 'debit', headerName: '차변', editable: true },
    { field: 'credit', headerName: '대변', editable: true },
    {
      field: 'evidenceFiles',
      headerName: '증빙',
      valueFormatter: (p) => (p.value?.length ? `${p.value.length}개` : '-')
    }
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    flex: 1
  }), [])

  const onCellValueChanged = (params: any) => {
    if (params.colDef.field !== 'accountId') return
    const option = accountOptions.find((o) => o.id === params.newValue)
    setRows((prev) => prev.map((row) => (
      row.id === params.data.id
        ? {
          ...row,
          accountId: params.newValue,
          categoryMain: option?.categoryMain ?? '',
          categoryMid: option?.categoryMid ?? '',
          categorySub: option?.categorySub ?? ''
        }
        : row
    )))
    if (option?.isCommonExpense) {
      setPendingCommonRowId(params.data.id)
      setModalOpen(true)
    }
  }

  const handleAutoAllocate = () => {
    if (!pendingCommonRowId) {
      setModalOpen(false)
      return
    }
    const target = rows.find((r) => r.id === pendingCommonRowId)
    if (!target) {
      setModalOpen(false)
      return
    }
    const amount = target.debit || target.credit
    const isDebit = target.debit > 0
    const publicPart = Math.round(amount * (allocationRatio / 100))
    const profitPart = amount - publicPart

    const newRows = rows.filter((r) => r.id !== pendingCommonRowId)
    newRows.push(
      {
        ...target,
        id: `${pendingCommonRowId}-public`,
        project: '공익',
        debit: isDebit ? publicPart : 0,
        credit: isDebit ? 0 : publicPart
      },
      {
        ...target,
        id: `${pendingCommonRowId}-profit`,
        project: '수익',
        debit: isDebit ? profitPart : 0,
        credit: isDebit ? 0 : profitPart
      }
    )

    setRows(newRows)
    setModalOpen(false)
    setPendingCommonRowId(null)
  }

  const handleFiles = (files: File[]) => {
    if (!selectedRowId) return
    setRows((prev) => prev.map((row) => (
      row.id === selectedRowId
        ? { ...row, evidenceFiles: [...row.evidenceFiles, ...files.map((f) => f.name)] }
        : row
    )))
  }

  const handleDownloadTemplate = () => {
    const header = [
      '일자',
      '전표유형',
      '프로젝트',
      '관',
      '항',
      '목',
      '계정과목',
      '재원',
      '차변',
      '대변',
      '증빙'
    ]

    const rowsForCsv = rows.map((row) => {
      const accountName = accountOptions.find((o) => o.id === row.accountId)?.name || row.accountId
      const fundingName = fundingSourceOptions.find((o) => o.id === row.fundingSource)?.name || row.fundingSource
      return [
        new Date().toISOString().slice(0, 10),
        '',
        row.project,
        row.categoryMain,
        row.categoryMid,
        row.categorySub,
        accountName,
        fundingName,
        row.debit,
        row.credit,
        row.evidenceFiles.join('; ')
      ]
    })

    const csv = [header, ...rowsForCsv]
      .map((line) => line.map(csvEscape).join(','))
      .join('\n')

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'journal-entry-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCsv = async (file: File) => {
    const text = await file.text()
    const parsed = parseCsv(text)
    if (!parsed.length) return
    const [header, ...dataRows] = parsed
    const index = new Map(header.map((name, i) => [name.trim(), i]))

    const get = (row: string[], key: string) => {
      const idx = index.get(key)
      return idx === undefined ? '' : (row[idx] ?? '').trim()
    }

    const nextRows: Row[] = dataRows
      .filter((r) => r.some((v) => v.trim() !== ''))
      .map((r, i) => {
        const accountText = get(r, '계정과목')
        const accountMatch = accountOptions.find((o) => o.name === accountText || o.id === accountText)
        const fundingText = get(r, '재원')
        const fundingMatch = fundingSourceOptions.find((o) => o.name === fundingText || o.id === fundingText)

        return {
          id: `import-${Date.now()}-${i}`,
          accountId: accountMatch?.id ?? '',
          categoryMain: get(r, '관'),
          categoryMid: get(r, '항'),
          categorySub: get(r, '목'),
          fundingSource: fundingMatch?.id ?? '',
          debit: Number(get(r, '차변') || 0),
          credit: Number(get(r, '대변') || 0),
          project: get(r, '프로젝트'),
          evidenceFiles: get(r, '증빙') ? get(r, '증빙').split(';').map((v) => v.trim()).filter(Boolean) : []
        }
      })

    setRows((prev) => (importMode === 'overwrite' ? nextRows : [...prev, ...nextRows]))
  }

  const handleDraftAccountChange = (accountId: string) => {
    const option = accountOptions.find((o) => o.id === accountId)
    setDraft((prev) => ({
      ...prev,
      accountId,
      categoryMain: option?.categoryMain ?? '',
      categoryMid: option?.categoryMid ?? '',
      categorySub: option?.categorySub ?? ''
    }))
  }

  const handleAddRow = () => {
    if (!draft.accountId) return
    const newRow = {
      ...draft,
      id: `row-${Date.now()}`
    }
    setRows((prev) => [...prev, newRow])
  }

  return (
    <div className="panel">
      <div className="grid-toolbar">
        <h2 className="section-title">스마트 전표 입력</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={importMode}
            onChange={(e) => setImportMode(e.target.value as 'append' | 'overwrite')}
          >
            <option value="append">업로드: 기존행 유지 + 추가</option>
            <option value="overwrite">업로드: 기존행 덮어쓰기</option>
          </select>
          <label className="button secondary" style={{ marginRight: 4 }}>
            업로드
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImportCsv(file)
                e.currentTarget.value = ''
              }}
            />
          </label>
          <button className="button secondary" onClick={handleDownloadTemplate}>
            엑셀 양식 다운로드
          </button>
          <div className="badge">미결재 6건</div>
        </div>
      </div>

      <div className="form-row">
        <input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        <select defaultValue="">
          <option value="">전표 유형</option>
          <option value="expense">비용</option>
          <option value="income">수익</option>
        </select>
      </div>

      <div className="form-row" style={{ flexWrap: 'wrap' }}>
        <select
          value={draft.project}
          onChange={(e) => setDraft((prev) => ({ ...prev, project: e.target.value }))}
        >
          <option value="공익">공익</option>
          <option value="수익">수익</option>
        </select>
        <select
          value={draft.accountId}
          onChange={(e) => handleDraftAccountChange(e.target.value)}
        >
          <option value="">계정과목 선택</option>
          {accountOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="관"
          value={draft.categoryMain}
          readOnly
        />
        <input
          type="text"
          placeholder="항"
          value={draft.categoryMid}
          readOnly
        />
        <input
          type="text"
          placeholder="목"
          value={draft.categorySub}
          readOnly
        />
        <select
          value={draft.fundingSource}
          onChange={(e) => setDraft((prev) => ({ ...prev, fundingSource: e.target.value }))}
        >
          <option value="">재원 선택</option>
          {fundingSourceOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.name}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="차변"
          value={draft.debit}
          onChange={(e) => setDraft((prev) => ({ ...prev, debit: Number(e.target.value) }))}
        />
        <input
          type="number"
          placeholder="대변"
          value={draft.credit}
          onChange={(e) => setDraft((prev) => ({ ...prev, credit: Number(e.target.value) }))}
        />
        <button className="button" onClick={handleAddRow}>행 추가</button>
      </div>

      <div className="ag-theme-quartz" style={{ height: 260, width: '100%' }}>
        <AgGridReact<Row>
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowSelection="single"
          onGridReady={(params) => setGridApi(params.api)}
          onSelectionChanged={() => {
            const selected = gridApi?.getSelectedRows()?.[0]
            setSelectedRowId(selected?.id ?? null)
          }}
          onCellValueChanged={onCellValueChanged}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <FileDropzone onFiles={handleFiles} />
        <div className="file-list">
          선택된 라인의 증빙 파일: {
            rows.find((r) => r.id === selectedRowId)?.evidenceFiles.join(', ') || '없음'
          }
        </div>
      </div>

      <Modal
        open={modalOpen}
        title="공통비 자동 안분"
        description="공통비 계정과목입니다. 설정된 비율로 자동 안분할까요?"
        onCancel={() => setModalOpen(false)}
        onConfirm={handleAutoAllocate}
      >
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>
            공익 {allocationRatio}% · 수익 {100 - allocationRatio}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={allocationRatio}
            onChange={(e) => setAllocationRatio(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </Modal>
    </div>
  )
}
