import { useMemo, useState } from 'react'

type ErpEntry = {
  transactionId: string
  date: string
  summary: string
  amount: number
  accountTitle: string
  ntsPurposeType: string
  ntsFunctionType: string
  ntsExpenseCategory: string
  projectCode: string
  department: string
  paymentMethod: string
  isTaxDeductible: boolean
  direction: 'DEBIT' | 'CREDIT'
}

const accountClassMap: Record<string, { type: 'BS' | 'IS', group: string }> = {
  현금및현금성자산: { type: 'BS', group: '자산' },
  단기금융상품: { type: 'BS', group: '자산' },
  미수금: { type: 'BS', group: '자산' },
  기본재산: { type: 'BS', group: '자산' },
  비품: { type: 'BS', group: '자산' },
  소프트웨어: { type: 'BS', group: '자산' },
  미지급금: { type: 'BS', group: '부채' },
  예수금: { type: 'BS', group: '부채' },
  퇴직급여충당부채: { type: 'BS', group: '부채' },
  기본순자산: { type: 'BS', group: '순자산' },
  보통순자산: { type: 'BS', group: '순자산' },
  적립금: { type: 'BS', group: '순자산' },
  기부금수익: { type: 'IS', group: '수익' },
  보조금수익: { type: 'IS', group: '수익' },
  회비수익: { type: 'IS', group: '수익' },
  이자수익: { type: 'IS', group: '수익' },
  배당수익: { type: 'IS', group: '수익' },
  목적사업비: { type: 'IS', group: '비용' },
  인력비: { type: 'IS', group: '비용' },
  임차료: { type: 'IS', group: '비용' },
  통신비: { type: 'IS', group: '비용' },
  홍보비: { type: 'IS', group: '비용' },
  회의비: { type: 'IS', group: '비용' },
  소모품비: { type: 'IS', group: '비용' }
}

const purposeLabel: Record<string, string> = {
  PUBLIC_INTEREST: '공익목적',
  OTHER: '기타수익사업'
}

const functionLabel: Record<string, string> = {
  PROGRAM_SERVICE: '사업수행비용',
  MANAGEMENT_GENERAL: '관리운영비용',
  FUNDRAISING: '모금활동비용'
}

const csvEscape = (value: string | number | boolean) => {
  const text = String(value ?? '')
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

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

const toNumber = (value: string) => {
  const cleaned = value.replace(/,/g, '').trim()
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeDirection = (value: string): 'DEBIT' | 'CREDIT' => (
  value?.toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT'
)

export default function FinancialStatements() {
  const [entries, setEntries] = useState<ErpEntry[]>([])
  const [importMode, setImportMode] = useState<'append' | 'overwrite'>('append')

  const handleDownloadTemplate = () => {
    const header = [
      'transaction_id',
      'date',
      'summary',
      'amount',
      'account_title',
      'nts_purpose_type',
      'nts_function_type',
      'nts_expense_category',
      'project_code',
      'department',
      'payment_method',
      'is_tax_deductible',
      'direction'
    ]
    const csv = [header.map(csvEscape).join(',')].join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'erp-journal-template.csv'
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

    const nextEntries: ErpEntry[] = dataRows
      .filter((r) => r.some((v) => v.trim() !== ''))
      .map((row) => {
        const accountTitle = get(row, 'account_title')
        const mapped = accountClassMap[accountTitle]
        const rawDirection = get(row, 'direction')
        let direction: 'DEBIT' | 'CREDIT' = normalizeDirection(rawDirection)
        if (!rawDirection && mapped?.group) {
          if (['부채', '순자산', '수익'].includes(mapped.group)) direction = 'CREDIT'
        }

        return {
          transactionId: get(row, 'transaction_id'),
          date: get(row, 'date'),
          summary: get(row, 'summary'),
          amount: toNumber(get(row, 'amount')),
          accountTitle,
          ntsPurposeType: get(row, 'nts_purpose_type') || 'PUBLIC_INTEREST',
          ntsFunctionType: get(row, 'nts_function_type'),
          ntsExpenseCategory: get(row, 'nts_expense_category'),
          projectCode: get(row, 'project_code'),
          department: get(row, 'department'),
          paymentMethod: get(row, 'payment_method'),
          isTaxDeductible: ['true', '1', 'y', 'yes'].includes(get(row, 'is_tax_deductible').toLowerCase()),
          direction
        }
      })

    setEntries((prev) => (importMode === 'overwrite' ? nextEntries : [...prev, ...nextEntries]))
  }

  const summary = useMemo(() => {
    const purposeTotals: Record<string, Record<string, number>> = {
      PUBLIC_INTEREST: {},
      OTHER: {}
    }
    const balanceTotals: Record<string, number> = { 자산: 0, 부채: 0, 순자산: 0, 미분류: 0 }

    entries.forEach((entry) => {
      const accountClass = accountClassMap[entry.accountTitle]
      const isRevenue = accountClass?.group === '수익' || entry.accountTitle.includes('수익')
      const isExpense = accountClass?.group === '비용' || Boolean(entry.ntsExpenseCategory)
      const purpose = entry.ntsPurposeType === 'OTHER' ? 'OTHER' : 'PUBLIC_INTEREST'

      if (accountClass?.type === 'BS') {
        const group = accountClass.group
        const amount = entry.amount
        if (group === '자산') {
          balanceTotals[group] += entry.direction === 'DEBIT' ? amount : -amount
        } else if (group === '부채' || group === '순자산') {
          balanceTotals[group] += entry.direction === 'CREDIT' ? amount : -amount
        } else {
          balanceTotals.미분류 += amount
        }
        return
      }

      if (isRevenue || isExpense) {
        const funcBucket = isRevenue ? '수익' : (functionLabel[entry.ntsFunctionType] ?? '관리운영비용')
        const target = purposeTotals[purpose]
        target[funcBucket] = (target[funcBucket] ?? 0) + Math.abs(entry.amount)
        return
      }

      balanceTotals.미분류 += entry.amount
    })

    return { purposeTotals, balanceTotals }
  }, [entries])

  const numberFormat = (value: number) => value.toLocaleString('ko-KR')

  return (
    <div className="panel">
      <div className="grid-toolbar">
        <h2 className="section-title">재무제표 생성</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={importMode} onChange={(e) => setImportMode(e.target.value as 'append' | 'overwrite')}>
            <option value="append">업로드: 기존행 유지 + 추가</option>
            <option value="overwrite">업로드: 기존행 덮어쓰기</option>
          </select>
          <label className="button secondary">
            ERP CSV 업로드
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
          <button className="button secondary" onClick={handleDownloadTemplate}>ERP 양식 다운로드</button>
        </div>
      </div>

      <div className="split-grid">
        <div className="panel-inner">
          <h3 className="section-title">운영성과표 (요약)</h3>
          <div className="table">
            <div className="table-row table-header">
              <div>구분</div>
              <div>공익목적</div>
              <div>기타수익사업</div>
              <div>합계</div>
            </div>
            {['수익', '사업수행비용', '관리운영비용', '모금활동비용'].map((key) => {
              const publicValue = summary.purposeTotals.PUBLIC_INTEREST[key] ?? 0
              const otherValue = summary.purposeTotals.OTHER[key] ?? 0
              return (
                <div className="table-row" key={key}>
                  <div><strong>{key}</strong></div>
                  <div>{numberFormat(publicValue)}</div>
                  <div>{numberFormat(otherValue)}</div>
                  <div>{numberFormat(publicValue + otherValue)}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="panel-inner">
          <h3 className="section-title">재무상태표 (요약)</h3>
          <div className="table">
            <div className="table-row table-header">
              <div>구분</div>
              <div>금액</div>
            </div>
            {['자산', '부채', '순자산', '미분류'].map((key) => (
              <div className="table-row" key={key}>
                <div><strong>{key}</strong></div>
                <div>{numberFormat(Math.max(0, summary.balanceTotals[key] ?? 0))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
