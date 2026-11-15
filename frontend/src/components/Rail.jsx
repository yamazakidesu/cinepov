import { durasi, jam, labelHari } from '../lib/format'

export default function Rail({ movies, movie, showtimes, showtimeId, onMovie, onShowtime }) {
  // kelompokkan jadwal per tanggal
  const perHari = {}
  for (const s of showtimes) {
    const tgl = s.starts_at.slice(0, 10)
    ;(perHari[tgl] ||= []).push(s)
  }

  return (
    <aside className="rail">
      <div className="brand">CinePOV</div>

      {movie && (
        <section>
          <h1 className="film-title">{movie.title}</h1>
          <p className="meta">
            {movie.genre} · {durasi(movie.duration_min)} · {movie.age_rating}
          </p>
          <p className="synopsis">{movie.synopsis}</p>
        </section>
      )}

      <section>
        <h2 className="section-title">Jam tayang</h2>
        {Object.entries(perHari).map(([tgl, list]) => (
          <div key={tgl} style={{ marginBottom: 14 }}>
            <p className="meta" style={{ margin: '0 0 8px' }}>{labelHari(tgl + 'T00:00')}</p>
            <div className="chips">
              {list.map((s) => (
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
          </div>
        ))}
      </section>

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
    </aside>
  )
}