import { useLayoutEffect, useMemo, useRef } from 'react'
import { aisleCount } from '../lib/geometry'

export default function SeatPlan({ hall, seats, selected, onTap }) {
  const gridRef = useRef(null)

  // kelompokkan kursi per baris: [['A', [kursi...]], ['B', [...]], ...]
  const rows = useMemo(() => {
    const map = new Map()
    for (const s of seats) {
      if (!map.has(s.row)) map.set(s.row, [])
      map.get(s.row).push(s)
    }
    return [...map.entries()]
  }, [seats])

  const tracks = hall.cols + aisleCount(hall)
  // perbandingan jarak baris : jarak kursi harus sama dengan di 3D supaya kamera 3D pas menempel di denah
  const ratio = hall.row_pitch_m / hall.seat_pitch_m

  // ukuran sel disesuaikan dengan lebar dan tinggi layar
  useLayoutEffect(() => {
    const el = gridRef.current
    function fit() {
      const wrap = el.parentElement
      const desktop = window.matchMedia('(min-width: 900px)').matches
      const byW = (wrap.clientWidth - 28) / tracks
      const byH = desktop ? (window.innerHeight - 340) / (hall.rows * ratio) : Infinity
      const cw = Math.max(17, Math.min(byW, byH, 42))
      el.style.setProperty('--cw', cw.toFixed(1) + 'px')
      el.style.setProperty('--rh', (cw * ratio).toFixed(1) + 'px')
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el.parentElement)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [tracks, hall.rows, ratio])

  return (
    <div className="plan" role="group" aria-label={`Denah kursi ${hall.name}`}>
      <div className="screen pchrome">
        <span>Layar</span>
      </div>

      <div className="seat-grid" ref={gridRef} style={{ '--n': tracks }}>
        {rows.map(([row, list]) => (
          <div className="seat-row" key={row}>
            <span className="row-label" aria-hidden="true">{row}</span>
            {list.flatMap((s) => {
              const cells = [
                <button
                  key={s.label}
                  data-seat={s.label}
                  className={`seat ${s.kind}`}
                  disabled={s.taken}
                  aria-pressed={selected.includes(s.label)}
                  aria-label={`Kursi ${s.label}${s.kind === 'lounge' ? ', lounge' : ''}${s.taken ? ', sudah terisi' : ''}`}
                  onClick={() => onTap(s)}
                />,
              ]
              if (hall.aisle_after.includes(s.col) && s.col < hall.cols) {
                cells.push(<span key={`gap-${s.col}`} className="aisle" aria-hidden="true" />)
              }
              return cells
            })}
          </div>
        ))}
      </div>

      <ul className="legend pchrome">
        <li><i className="seat-sample" /> Tersedia</li>
        <li><i className="seat-sample lounge" /> Lounge</li>
        <li><i className="seat-sample taken" /> Terisi</li>
        <li><i className="seat-sample picked" /> Pilihanmu</li>
      </ul>
    </div>
  )
}