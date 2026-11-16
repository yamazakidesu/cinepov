import { useEffect, useState } from 'react'
import { api } from './api'
import Rail from './components/Rail'
import SeatPlan from './components/SeatPlan'
import BookBar, { MAX } from './components/BookBar'

export default function App() {
  const [movies, setMovies] = useState([])
  const [movieId, setMovieId] = useState(null)
  const [detail, setDetail] = useState(null) // { movie, showtimes }
  const [showtimeId, setShowtimeId] = useState(null)
  const [hall, setHall] = useState(null)
  const [seats, setSeats] = useState([])
  const [selected, setSelected] = useState([]) // label kursi, urutan klik
  const [full, setFull] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.movies()
      .then((list) => {
        setMovies(list)
        setMovieId(list[0]?.id ?? null)
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (movieId == null) return
    api.movie(movieId)
      .then((d) => {
        setDetail(d)
        setShowtimeId(d.showtimes[0]?.id ?? null)
      })
      .catch((e) => setError(e.message))
  }, [movieId])

  // data studio + semua kursi, tiap kali jadwal berganti
  useEffect(() => {
    if (showtimeId == null) return
    setSelected([])
    setFull(false)
    Promise.all([api.showtime(showtimeId), api.seats(showtimeId)])
      .then(([st, sc]) => {
        setHall(st.hall)
        setSeats(sc.seats)
      })
      .catch((e) => setError(e.message))
  }, [showtimeId])

  function toggle(seat) {
    setFull(false)
    setSelected((cur) => {
      if (cur.includes(seat.label)) return cur.filter((l) => l !== seat.label)
      if (cur.length >= MAX) {
        setFull(true)
        return cur
      }
      return [...cur, seat.label]
    })
  }

  const picked = selected.map((l) => seats.find((s) => s.label === l)).filter(Boolean)

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
          <p className="status error">{error}. Pastikan backend jalan.</p>
        ) : hall ? (
          <>
            <SeatPlan hall={hall} seats={seats} selected={selected} onToggle={toggle} />
            <BookBar picked={picked} full={full} />
          </>
        ) : (
          <p className="status">Memuat…</p>
        )}
      </main>
    </div>
  )
}