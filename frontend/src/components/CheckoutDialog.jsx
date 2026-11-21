import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { jam, rupiah, tanggalPanjang } from '../lib/format'
import Ticket from './Ticket'

// Dua tahap dalam satu dialog: 1) isi data dan konfirmasi, 2) tiket.
export default function CheckoutDialog({ movie, hallName, showtime, picked, onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [ticket, setTicket] = useState(null)
  const nameRef = useRef(null)

  const total = picked.reduce((sum, s) => sum + s.price, 0)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  // Escape menutup dialog (khusus dialog, tidak ikut menutup tampilan POV)
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose({ booked: !!ticket, conflict })
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, ticket, conflict])

  async function submit(e) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    setError('')
    try {
      const { code } = await api.book({
        showtime_id: showtime.id,
        name: name.trim(),
        email: email.trim(),
        seats: picked.map((s) => ({ row: s.row, col: s.col })),
      })
      setTicket(await api.ticket(code)) // tiket diambil dari server, bukan dihitung ulang di sini
    } catch (err) {
      setError(err.message)
      // 409: kursi keburu dipesan orang lain, pesan dari backend sudah menjelaskan
      setConflict(/dipesan orang lain/i.test(err.message))
    } finally {
      setSending(false)
    }
  }

  const close = () => onClose({ booked: !!ticket, conflict })

  return (
    <div className="dlg-back" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="dlg" role="dialog" aria-modal="true" aria-label={ticket ? 'Tiket' : 'Konfirmasi pesanan'}>
        {ticket ? (
          <Ticket ticket={ticket} onDone={close} />
        ) : (
          <form onSubmit={submit}>
            <div className="dlg-head">
              <h2 className="dlg-title">Konfirmasi pesanan</h2>
              <button type="button" className="dlg-x" onClick={close} aria-label="Tutup">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <path d="m4 4 8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            <div className="order">
              <p className="order-film">{movie?.title}</p>
              <p className="order-meta">
                {tanggalPanjang(showtime.starts_at)} · {jam(showtime.starts_at)} · {hallName}
              </p>
              <ul className="order-seats">
                {picked.map((s) => (
                  <li key={s.label}>
                    <span>
                      Kursi {s.label} <small>{s.kind === 'lounge' ? 'Lounge' : 'Standar'}</small>
                    </span>
                    <span>{rupiah(s.price)}</span>
                  </li>
                ))}
              </ul>
              <p className="order-total">
                <span>Total</span>
                <b>{rupiah(total)}</b>
              </p>
            </div>

            <label className="field">
              <span>Nama</span>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                autoComplete="name"
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={120}
                autoComplete="email"
              />
            </label>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            {conflict ? (
              <button type="button" className="btn wide" onClick={close}>
                Pilih kursi lain
              </button>
            ) : (
              <button className="btn wide" disabled={sending}>
                {sending ? 'Memproses…' : `Pesan · ${rupiah(total)}`}
              </button>
            )}
            <p className="demo-note">Mode demo: belum ada pembayaran sungguhan.</p>
          </form>
        )}
      </div>
    </div>
  )
}