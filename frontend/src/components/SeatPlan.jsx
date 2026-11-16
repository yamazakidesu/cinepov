import { useMemo } from 'react'

export default function SeatPlan({ hall, seats, selected, onToggle }) {
  // kelompokkan kursi per baris: [['A', [kursi...]], ['B', [...]], ...]
  const rows = useMemo(() => {
    const map = new Map()
    for (const s of seats) {
      if (!map.has(s.row)) map.set(s.row, [])
      map.get(s.row).push(s)
    }
    return [...map.entries()]
  }, [seats])

  // satu kolom per kursi, ditambah kolom sempit untuk lorong setelah kolom tertentu
  const tracks = useMemo(() => {
    const parts = []
    for (let c = 1; c <= hall.cols; c++) {
      parts.push('minmax(0, 1fr)')
      if (hall.aisle_after.includes(c) && c < hall.cols) parts.push('minmax(0, 0.9fr)')
    }
    return parts.join(' ')
  }, [hall])

  return (
    <div className="plan" role="group" aria-label={`Denah kursi ${hall.name}`}>
      <div className="screen">
        <span>Layar</span>
      </div>

      <div className="seat-grid">
        {rows.map(([row, list]) => (
          <div className="seat-row" key={row} style={{ gridTemplateColumns: `1.5rem ${tracks}` }}>
            <span className="row-label" aria-hidden="true">{row}</span>
            {list.flatMap((s) => {
              const cells = [
                <button
                  key={s.label}
                  className={`seat ${s.kind}`}
                  disabled={s.taken}
                  aria-pressed={selected.includes(s.label)}
                  aria-label={`Kursi ${s.label}${s.taken ? ', sudah terisi' : ''}${s.kind === 'lounge' ? ', lounge' : ''}`}
                  onClick={() => onToggle(s)}
                />,
              ]
              if (hall.aisle_after.includes(s.col) && s.col < hall.cols) {
                cells.push(<span key={`gap-${s.col}`} aria-hidden="true" />)
              }
              return cells
            })}
          </div>
        ))}
      </div>

      <ul className="legend">
        <li><i className="seat-sample" /> Tersedia</li>
        <li><i className="seat-sample lounge" /> Lounge</li>
        <li><i className="seat-sample taken" /> Terisi</li>
        <li><i className="seat-sample picked" /> Pilihanmu</li>
      </ul>
    </div>
  )
}