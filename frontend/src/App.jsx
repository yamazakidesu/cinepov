import { useEffect, useState } from 'react'
import { api } from './api'
import Rail from './components/Rail'

export default function App() {
  const [movies, setMovies] = useState([])
  const [movieId, setMovieId] = useState(null)
  const [detail, setDetail] = useState(null) // { movie, showtimes }
  const [showtimeId, setShowtimeId] = useState(null)
  const [hall, setHall] = useState(null)
  const [error, setError] = useState('')

  // 1) daftar film, sekali saat app dibuka
  useEffect(() => {
    api.movies()
      .then((list) => {
        setMovies(list)
        setMovieId(list[0]?.id ?? null)
      })
      .catch((e) => setError(e.message))
  }, [])

  // 2) detail film + jadwal tiap kali film berganti
  useEffect(() => {
    if (movieId == null) return
    api.movie(movieId)
      .then((d) => {
        setDetail(d)
        setShowtimeId(d.showtimes[0]?.id ?? null)
      })
      .catch((e) => setError(e.message))
  }, [movieId])

  // 3) data studio untuk jadwal terpilih
  useEffect(() => {
    if (showtimeId == null) return
    api.showtime(showtimeId)
      .then((d) => setHall(d.hall))
      .catch((e) => setError(e.message))
  }, [showtimeId])

  return (
    <div className="app">
      <Rail
        movies={movies}
        movie={detail?.movie}
        showtimes={detail?.showtimes ?? []}
        showtimeId={showtimeId}
        onMovie={setMovieId}
        onShowtime={setShowtimeId}
      />
      <main className="stage">
        {error ? (
          <p className="status error">{error}. Pastikan backend jalan di port 5000.</p>
        ) : hall ? (
          <p className="status">
            {hall.name} · {hall.rows} baris × {hall.cols} kursi
            <br />
            Denah kursi menyusul di langkah berikutnya.
          </p>
        ) : (
          <p className="status">Memuat…</p>
        )}
      </main>
    </div>
  )
}