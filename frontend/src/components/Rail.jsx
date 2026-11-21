import { useState } from 'react'
import { durasi, jam, labelHari } from '../lib/format'

export default function Rail({ movies, movie, showtimes, showtimeId, onMovie, onShowtime, onLookup }) {
  const [dayIdx, setDayIdx] = useState(0)

  // kelompokkan jadwal per tanggal: [['2026-11-17', [jadwal...]], ...]
  const perHari = {}
  for (const s of showtimes) {
    const tgl = s.starts_at.slice(0, 10)
    ;(perHari[tgl] ||= []).push(s)
  }
  const days = Object.entries(perHari)
  const active = days[Math.min(dayIdx, days.length - 1)]

  return (
    <aside className="rail">
      <div className="brand-row">
        <div className="brand">CinePOV</div>
        <button className="link" onClick={onLookup}>Cek tiket</button>
      </div>

      {movie && (
        <section>
          <h1 className="film-title">{movie.title}</h1>
          <p className="meta">
            {movie.genre} · {durasi(movie.duration_min)} · {movie.age_rating}
          </p>
          <p className="synopsis">{movie.synopsis}</p>
        </section>
      )}

      {days.length > 0 && (
        <section>
          <h2 className="section-title">Jam tayang</h2>
          <div className="days" role="tablist">
            {days.map(([tgl], i) => (
              <button
                key={tgl}
                className="day"
                role="tab"
                aria-selected={active?.[0] === tgl}
                onClick={() => setDayIdx(i)}
              >
                {labelHari(tgl + 'T00:00')}
              </button>
            ))}
          </div>
          <div className="chips">
            {active?.[1].map((s) => (
              <button
                key={s.id}
                className="chip"
                aria-pressed={s.id === showtimeId}
                onClick={() => onShowtime(s.id)}
              >
                {jam(s.starts_at)}
              </button>
            ))}
          </div>
        </section>
      )}

      {movies.length > 0 && (
        <section>
          <h2 className="section-title">Film lain</h2>
          <div className="film-list">
            {movies.map((m) => (
              <button
                key={m.id}
                className="film-row"
                aria-current={movie?.id === m.id}
                onClick={() => onMovie(m.id)}
              >
                <span>{m.title}</span>
                <small>{m.genre}</small>
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  )
}