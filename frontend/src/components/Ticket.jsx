import { useState } from 'react'
import { jam, rupiah, tanggalPanjang } from '../lib/format'

// Tampilan tiket. Dipakai setelah memesan dan saat "Cek tiket".
export default function Ticket({ ticket, title = 'Pesanan berhasil', onDone, doneLabel = 'Selesai' }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(ticket.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard diblokir: kode tetap bisa disalin manual */
    }
  }

  return (
    <div className="ticket-wrap">
      <p className="ticket-ok">{title}</p>
      <article className="ticket" aria-label={`Tiket ${ticket.code}`}>
        <div className="ticket-top">
          <h2 className="ticket-film">{ticket.movie}</h2>
          <p className="ticket-meta">
            {tanggalPanjang(ticket.starts_at)} · {jam(ticket.starts_at)}
          </p>
          <p className="ticket-meta">{ticket.hall}</p>
          <p className="ticket-seats">{ticket.seats.map((s) => s.label).join(', ')}</p>
        </div>
        <div className="ticket-cut" aria-hidden="true" />
        <div className="ticket-bottom">
          <p className="ticket-label">Kode pesanan</p>
          <p className="ticket-code">{ticket.code}</p>
          <p className="ticket-meta">
            {ticket.name} · {rupiah(ticket.total)}
          </p>
        </div>
      </article>
      <p className="demo-note">Tunjukkan kode ini di loket untuk mencetak tiket.</p>
      <div className="ticket-actions">
        <button className="btn" onClick={onDone}>{doneLabel}</button>
        <button className="link" onClick={copy}>{copied ? 'Tersalin' : 'Salin kode'}</button>
      </div>
    </div>
  )
}