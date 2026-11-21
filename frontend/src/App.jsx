import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import Rail from './components/Rail'
import SeatPlan from './components/SeatPlan'
import BookBar, { MAX } from './components/BookBar'
import PovLayer from './components/PovLayer'
import CheckoutDialog from './components/CheckoutDialog'
import LookupDialog from './components/LookupDialog'
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
  const [notice, setNotice] = useState('') // pesan singkat di atas bar pesan
  const [error, setError] = useState('')
  const [tries, setTries] = useState(0) // dinaikkan oleh tombol "Coba lagi"
  const [checkout, setCheckout] = useState(false)
  const [lookup, setLookup] = useState(false)

  // ---- transisi 2D <-> POV ----
  const [view, setView] = useState('map') // map | toPov | pov | toMap
  const [fx, setFx] = useState({}) // kelas animasi: canvasOn, planOff, chromeOff, povShown, sheetUp, planHidden, sheetClosing
  const [focus, setFocus] = useState(null) // label kursi yang sedang dilihat
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const timers = useRef([])
  const busy = useRef(false)
  const selectedRef = useRef([])

  /* ---------- data ---------- */
  // Tiap efek memakai penanda "cancelled": kalau user keburu pindah film/jadwal,
  // jawaban lama dari server dibuang supaya tidak menimpa data yang baru.
  function retry() {
    setError('')
    setTries((t) => t + 1)
  }

  useEffect(() => {
    let cancelled = false
    api.movies()
      .then((list) => {
        if (cancelled) return
        setMovies(list)
        setMovieId((id) => id ?? list[0]?.id ?? null)
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [tries])

  useEffect(() => {
    if (movieId == null) return
    let cancelled = false
    api.movie(movieId)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        const first = d.showtimes[0]?.id ?? null
        setShowtimeId(first)
        if (first == null) {
          setHall(null) // film tanpa jadwal: jangan tampilkan denah film sebelumnya
          setSeats([])
          setSelected([])
        }
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [movieId, tries])

  useEffect(() => {
    if (showtimeId == null) return
    let cancelled = false
    setSelected([])
    setNotice('')
    setHall(null) // tampilkan "Memuat denah" selama data jadwal baru diambil
    Promise.all([api.showtime(showtimeId), api.seats(showtimeId)])
      .then(([st, sc]) => {
        if (cancelled) return
        setHall(st.hall)
        setSeats(sc.seats)
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [showtimeId, tries])

  // judul tab browser mengikuti film
  useEffect(() => {
    document.title = detail?.movie ? `${detail.movie.title} · CinePOV` : 'CinePOV'
  }, [detail])

  // Ambil ulang status kursi dari server (dipakai juga setelah memesan).
  // Kursi pilihan yang ternyata sudah diambil orang lain dilepas, user diberi tahu.
  const refreshSeats = useCallback(async () => {
    if (showtimeId == null) return
    try {
      const sc = await api.seats(showtimeId)
      setSeats(sc.seats)
      const cur = selectedRef.current
      const keep = cur.filter((l) => !sc.seats.find((s) => s.label === l)?.taken)
      if (keep.length !== cur.length) {
        setSelected(keep)
        setNotice('Ada kursi pilihanmu yang baru saja dipesan orang lain.')
      }
    } catch {
      /* gagal diam-diam: data lama tetap tampil */
    }
  }, [showtimeId])

  // Selama denah terbuka, segarkan tiap 20 detik dan saat tab kembali dilihat.
  useEffect(() => {
    if (checkout || lookup || !hall) return
    function tick() {
      if (document.visibilityState === 'visible' && viewRef.current === 'map' && !busy.current) refreshSeats()
    }
    const id = setInterval(tick, 20000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [refreshSeats, checkout, lookup, hall])

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

  // 3D dibangun ulang hanya saat studio atau film berganti, bukan tiap status kursi diperbarui
  useEffect(() => {
    if (hall && seats.length && sceneRef.current) {
      const still = (detail?.movie?.id ?? 1) - 1
      sceneRef.current.resize()
      sceneRef.current.setHall(hall, seats, still)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hall, detail?.movie?.id])

  useEffect(() => {
    selectedRef.current = selected
    sceneRef.current?.setSelected(selected)
  }, [selected])

  // kunci scroll halaman selama bukan di denah (HP)
  useEffect(() => {
    document.body.style.overflow = view === 'map' && !checkout && !lookup ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [view, checkout, lookup])

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
      setNotice('')
      if (selected.includes(seat.label)) {
        setSelected(selected.filter((l) => l !== seat.label)) // klik lagi = batal
        return
      }
      if (selected.length >= MAX) {
        setNotice(`Maksimal ${MAX} kursi per pesanan.`)
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

  // dialog ditutup: kalau sudah berhasil atau ada konflik, segarkan status kursi dari server
  function closeCheckout({ booked, conflict }) {
    setCheckout(false)
    if (!booked && !conflict) return
    if (booked) {
      selectedRef.current = [] // kursi yang baru dipesan bukan "pilihan yang diambil orang lain"
      setSelected([])
    }
    refreshSeats()
    if (viewRef.current === 'pov') goMap()
  }

  // Rail tetap tampak di desktop saat POV: abaikan ganti film/jadwal selama bukan di denah
  const onlyOnMap = (fn) => (arg) => {
    if (viewRef.current === 'map' && !busy.current) fn(arg)
  }

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
        onMovie={onlyOnMap(setMovieId)}
        onShowtime={onlyOnMap(setShowtimeId)}
        onLookup={() => setLookup(true)}
      />
      <main className="stage">
        {error ? (
          <div className="status-box">
            <p className="status error">{error}.</p>
            <button className="btn" onClick={retry}>Coba lagi</button>
          </div>
        ) : detail && showtimeId == null ? (
          <p className="status status-box">Belum ada jadwal tayang untuk film ini.</p>
        ) : hall ? (
          <>
            <SeatPlan hall={hall} seats={seats} selected={selected} onTap={onTap} />
            <BookBar picked={picked} notice={notice} onOrder={() => setCheckout(true)} />
          </>
        ) : (
          <p className="status status-box pulse" aria-busy="true">Memuat denah…</p>
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
        onOrder={() => setCheckout(true)}
      />
      {checkout && showtime && (
        <CheckoutDialog
          movie={detail?.movie}
          hallName={hall?.name}
          showtime={showtime}
          picked={picked}
          onClose={closeCheckout}
        />
      )}
      {lookup && <LookupDialog onClose={() => setLookup(false)} />}
    </div>
  )
}