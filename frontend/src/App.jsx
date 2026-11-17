import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import Rail from './components/Rail'
import SeatPlan from './components/SeatPlan'
import BookBar, { MAX } from './components/BookBar'
import PovLayer from './components/PovLayer'
import { HallScene } from './lib/hall3d'
import { jam } from './lib/format'

const isDesk = () => window.matchMedia('(min-width: 900px)').matches
const ROWS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

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

  // ---- transisi 2D <-> POV ----
  const [view, setView] = useState('map') // map | toPov | pov | toMap
  const [fx, setFx] = useState({}) // kelas animasi: canvasOn, planOff, chromeOff, povShown, sheetUp, planHidden, sheetClosing
  const [focus, setFocus] = useState(null) // label kursi yang sedang dilihat
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const timers = useRef([])
  const busy = useRef(false)

  /* ---------- data ---------- */
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

  /* ---------- scene 3D ---------- */
  useEffect(() => {
    const scene = new HallScene(canvasRef.current)
    sceneRef.current = scene
    const canvas = canvasRef.current
    const ro = new ResizeObserver(() => {
      scene.resize()
      if (!scene.hall) return
      if (viewRef.current === 'pov') scene.applyPose(poseFor(scene, focusRef.current))
      scene.render()
    })
    ro.observe(canvas)
    const timerList = timers.current
    return () => {
      ro.disconnect()
      timerList.forEach(clearTimeout)
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    if (hall && seats.length && sceneRef.current) {
      const still = (detail?.movie?.id ?? 1) - 1
      sceneRef.current.resize()
      sceneRef.current.setHall(hall, seats, still)
    }
  }, [hall, seats, detail])

  useEffect(() => {
    sceneRef.current?.setSelected(selected)
  }, [selected])

  // kunci scroll halaman selama bukan di denah (HP)
  useEffect(() => {
    document.body.style.overflow = view === 'map' ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [view])

  const viewRef = useRef(view)
  const focusRef = useRef(focus)
  useEffect(() => {
    viewRef.current = view
    focusRef.current = focus
  })

  /* ---------- pose kamera ---------- */
  function poseFor(scene, label) {
    const r = ROWS.indexOf(label[0])
    const c = parseInt(label.slice(1), 10)
    return scene.povPose(r, c, isDesk())
  }

  function seatCenter(label) {
    const b = document.querySelector(`[data-seat="${label}"]`).getBoundingClientRect()
    const cr = canvasRef.current.getBoundingClientRect()
    return { x: b.left + b.width / 2 - cr.left, y: b.top + b.height / 2 - cr.top }
  }

  function overheadPose(scene) {
    const last = ROWS[hall.rows - 1] + hall.cols
    return scene.overheadPose(seatCenter('A1'), seatCenter(last))
  }

  const later = (fn, ms) => {
    if (sceneRef.current?.reduce) fn()
    else timers.current.push(setTimeout(fn, ms))
  }
  const set = (patch) => setFx((f) => ({ ...f, ...patch }))

  /* ---------- transisi (timing diukur dari video acuan) ----------
     Maju : denah memudar, 3D atas muncul (330 ms) -> kamera turun 1250 ms -> label muncul di +300 ms
            -> sheet naik di +1000 ms (hampir mendarat), 600 ms ease-out.
     Mundur: sheet turun 300 ms -> (180 ms) kamera naik 1100 ms -> 3D memudar ke denah 450 ms. */
  function goPov(label, nextSelected) {
    const scene = sceneRef.current
    busy.current = true
    setFocus(label)
    setView('toPov')
    scene.resize()
    scene.setSelected(nextSelected)
    const from = overheadPose(scene)
    scene.applyPose(from)
    scene.render()
    scene.start()
    set({ chromeOff: true, planOff: true, canvasOn: true })
    later(() => {
      scene.fly(from, poseFor(scene, label), 1250, () => {
        setView('pov')
        busy.current = false
        set({ planHidden: true })
      })
      later(() => set({ povShown: true }), 300)
      later(() => set({ sheetUp: true }), 1000)
    }, 330)
  }

  function goMap() {
    if (busy.current || viewRef.current !== 'pov') return
    const scene = sceneRef.current
    busy.current = true
    setView('toMap')
    set({ sheetClosing: true, sheetUp: false, povShown: false, planHidden: false })
    later(() => {
      scene.fly(scene.currentPose(), overheadPose(scene), 1100, () => {
        set({ chromeOff: false, planOff: false, canvasOn: false, sheetClosing: false })
        later(() => {
          setView('map')
          busy.current = false
          scene.stop()
        }, 450)
      })
    }, 180)
  }

  const onTap = useCallback(
    (seat) => {
      if (busy.current || view !== 'map' || seat.taken) return
      setFull(false)
      if (selected.includes(seat.label)) {
        setSelected(selected.filter((l) => l !== seat.label)) // klik lagi = batal
        return
      }
      if (selected.length >= MAX) {
        setFull(true)
        return
      }
      const next = [...selected, seat.label]
      setSelected(next)
      goPov(seat.label, next)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, selected, hall],
  )

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') goMap()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---------- tampilan ---------- */
  const picked = selected.map((l) => seats.find((s) => s.label === l)).filter(Boolean)
  const focusSeat = seats.find((s) => s.label === focus)
  const total = picked.reduce((sum, s) => sum + s.price, 0)
  const showtime = detail?.showtimes.find((s) => s.id === showtimeId)
  const cls = ['app', ...Object.entries(fx).filter(([, v]) => v).map(([k]) => 'fx-' + k)].join(' ')

  return (
    <div className={cls}>
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
            <SeatPlan hall={hall} seats={seats} selected={selected} onTap={onTap} />
            <BookBar picked={picked} full={full} />
          </>
        ) : (
          <p className="status">Memuat…</p>
        )}
      </main>

      <canvas ref={canvasRef} className="gl" aria-hidden="true" />
      <PovLayer
        seat={focusSeat}
        movie={detail?.movie}
        hallName={hall?.name}
        time={showtime ? jam(showtime.starts_at) : ''}
        total={total}
        count={picked.length}
        onBack={goMap}
      />
    </div>
  )
}