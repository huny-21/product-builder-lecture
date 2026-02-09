import { useState } from 'react'
import Dashboard from './components/Dashboard'
import SmartJournalEntryForm from './components/SmartJournalEntryForm'
import FinancialStatements from './components/FinancialStatements'
import ExecutiveManagement from './components/ExecutiveManagement'
import NotaryService from './components/NotaryService'
import OtherServices from './components/OtherServices'
import Sidebar from './components/Sidebar'
import './styles.css'

const navItems = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'journal', label: '전표 입력' },
  { id: 'statements', label: '재무제표 생성' },
  { id: 'executive', label: '임원 관리' },
  { id: 'notary', label: '공증/의결' },
  { id: 'services', label: '기타 서비스' }
]

export default function App() {
  const [active, setActive] = useState('dashboard')

  return (
    <div className="layout">
      <Sidebar active={active} items={navItems} onSelect={setActive} />
      <main className="main">
        {active === 'dashboard' && <Dashboard />}
        {active === 'journal' && <SmartJournalEntryForm />}
        {active === 'statements' && <FinancialStatements />}
        {active === 'executive' && <ExecutiveManagement />}
        {active === 'notary' && <NotaryService />}
        {active === 'services' && <OtherServices />}
      </main>
    </div>
  )
}
