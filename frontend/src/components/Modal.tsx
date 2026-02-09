import type { ReactNode } from 'react'

type ModalProps = {
  open: boolean
  title: string
  description?: string
  children?: ReactNode
  onConfirm: () => void
  onCancel: () => void
}

export default function Modal({ open, title, description, children, onConfirm, onCancel }: ModalProps) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        {children}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="button secondary" onClick={onCancel}>취소</button>
          <button className="button" onClick={onConfirm}>자동 안분</button>
        </div>
      </div>
    </div>
  )
}
