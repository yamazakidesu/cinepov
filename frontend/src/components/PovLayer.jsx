import { rupiah } from '../lib/format'

const d1 = (n) => n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export default function PovLayer({ seat, movie, hallName, time, total, count, onBack }) {
  if (!seat) return null
  const off = Math.abs(seat.offset_m)
  return (
    <div className="povlayer">
      <div className="povtop">
        <button className="back" onClick={onBack}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 3 5 8l5 5" />
          </svg>
          Denah
        </button>
        <p className="viewchip">
          Pandangan dari <b>{seat.label}</b>
        </p>
      </div>

      <section className="sheet" aria-label={`Detail kursi ${seat.label}`}>
        <div className="shead">
          <div>
            <h2 className="sheet-title">Baris {seat.row}, Kursi {seat.col}</h2>
            <p className="ssub">
              {seat.zone} · {seat.kind === 'lounge' ? 'Lounge' : 'Standar'}
            </p>
          </div>
          <p className="sheet-film">
            {movie?.title}
            <span>{time} · {hallName}</span>
          </p>
        </div>

        <dl className="stats">
          <div>
            <dt>Jarak ke layar</dt>
            <dd>{d1(seat.distance_m)}<small>m</small></dd>
          </div>
          <div>
            <dt>Sudut pandang</dt>
            <dd>{seat.view_angle_deg}<small>°</small></dd>
          </div>
          <div>
            <dt>{off < 0.05 ? 'Tepat di tengah' : `${seat.offset_m < 0 ? 'Kiri' : 'Kanan'} dari tengah`}</dt>
            <dd>{off < 0.05 ? '0' : d1(off)}<small>m</small></dd>
          </div>
        </dl>

        <div className="sheet-actions">
          <button className="btn" disabled>
            Pesan · {rupiah(total)}
          </button>
          <button className="link" onClick={onBack}>
            {count > 1 ? `${count} kursi dipilih · pilih lagi` : 'Pilih kursi lain'}
          </button>
        </div>
      </section>
    </div>
  )
}