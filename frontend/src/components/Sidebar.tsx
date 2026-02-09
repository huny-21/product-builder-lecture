type NavItem = {
  id: string
  label: string
}

type SidebarProps = {
  active: string
  items: NavItem[]
  onSelect: (id: string) => void
}

export default function Sidebar({ active, items, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">NPO</div>
        <div>
          <div className="brand-title">TrustOS</div>
          <div className="brand-sub">공익법인 통합 운영</div>
        </div>
      </div>
      <nav className="nav">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
