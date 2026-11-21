import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import Ticket from './Ticket'

// Cari tiket yang sudah dipesan dari kodenya.
export default function LookupDialog({ onClose }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ticket, setTicket] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  async function submit(e) {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    if (!c || loading) return
    setLoading(true)
    setError('')
    try {
      setTicket(await api.ticket(c))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dlg-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dlg" role="dialog" aria-modal="true" aria-label="Cek tiket">
        {ticket ? (
          <Ticket ticket={ticket} title="Tiketmu" onDone={onClose} doneLabel="Tutup" />
        ) : (
          <form onSubmit={submit}>
            <div className="dlg-head">
              <h2 className="dlg-title">Cek tiket</h2>
              <button type="button" className="dlg-x" onClick={onClose} aria-label="Tutup">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <path d="m4 4 8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
            <label className="field">
              <span>Kode pesanan</span>
              <input
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Contoh: CPWK8F2G"
                maxLength={12}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck="false"
                required
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn wide" disabled={loading}>
              {loading ? 'Mencari…' : 'Cari tiket'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}