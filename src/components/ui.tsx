import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

// ---------------------------------------------------------------- Button ---
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon'
  block?: boolean
}
export function Button({ variant = 'secondary', block, className = '', ...props }: ButtonProps) {
  const classes = ['btn', `btn-${variant}`, block ? 'btn-block' : '', className].filter(Boolean).join(' ')
  return <button className={classes} {...props} />
}

// ----------------------------------------------------------------- Field ---
interface FieldProps {
  label: string
  htmlFor?: string
  error?: string | null
  children: ReactNode
}
export function Field({ label, htmlFor, error, children }: FieldProps) {
  const autoId = useId()
  const id = htmlFor ?? autoId
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

export function Input({ className = '', invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`input ${invalid ? 'input-invalid' : ''} ${className}`} {...props} />
}

// -------------------------------------------------------------------- Seg --
interface SegOption<T extends string> { value: T; label: string; icon?: ReactNode }
interface SegProps<T extends string> {
  options: SegOption<T>[]
  value: T
  onChange: (v: T) => void
  name: string
}
export function Seg<T extends string>({ options, value, onChange, name }: SegProps<T>) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((opt) => (
        <label key={opt.value} className={`seg-opt ${value === opt.value ? 'seg-opt-ativo' : ''}`}>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
          {opt.icon}
          {opt.label}
        </label>
      ))}
    </div>
  )
}

// -------------------------------------------------------------------- Tag --
export function Tag({ variant = 'neutral', children }: { variant?: 'accent' | 'accent-2' | 'neutral'; children: ReactNode }) {
  return <span className={`tag tag-${variant}`}>{children}</span>
}

// ------------------------------------------------------------------- Card --
export function Card({ destaque, className = '', children }: { destaque?: boolean; className?: string; children: ReactNode }) {
  return <div className={`card ${destaque ? 'card-destaque' : ''} elev-sm ${className}`}>{children}</div>
}

// -------------------------------------------------------- Sheet / Dialog ---
function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

export function BottomSheet({ title, onClose, children, avisoAlcance }: { title: string; onClose: () => void; children: ReactNode; avisoAlcance?: ReactNode }) {
  useEscapeToClose(onClose)
  return createPortal(
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="sheet-title">{title}</span>
        {avisoAlcance && <div className="sheet-aviso">{avisoAlcance}</div>}
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function Dialog({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions: ReactNode }) {
  useEscapeToClose(onClose)
  return createPortal(
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <span className="dialog-title">{title}</span>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>,
    document.body,
  )
}

// ------------------------------------------------------------ EmptyState ---
export function EmptyState({ icon, title, description, action, secondary }: {
  icon: ReactNode; title: string; description: string; action?: ReactNode; secondary?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><div className="empty-state-icon-inner">{icon}</div></div>
      <div>
        <span className="empty-state-title" style={{ display: 'block' }}>{title}</span>
        <span className="empty-state-desc" style={{ display: 'block' }}>{description}</span>
      </div>
      {action}
      {secondary}
    </div>
  )
}

// ----------------------------------------------------------- ProgressBar ---
export function ProgressBar({ percentual }: { percentual: number }) {
  const largura = Math.min(Math.max(percentual, 0), 100)
  return (
    <div className="progress-bar-track">
      <div className="progress-bar-fill" style={{ width: `${largura}%` }} />
    </div>
  )
}
