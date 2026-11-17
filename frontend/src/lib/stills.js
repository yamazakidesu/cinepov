// screen picture for stills. 5 pictures, 1 for each film. Each picture is generated procedurally with canvas.
// Urutan sama dengan urutan film di seed: id film 1..5 -> still 0..4.

export function rng(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sky(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  stops.forEach((s) => g.addColorStop(s[0], s[1]))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function ridge(ctx, w, base, amp, f1, f2, ph, color, h) {
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += 8) {
    ctx.lineTo(x, base + Math.sin(x * f1 + ph) * amp + Math.sin(x * f2 + ph * 2.1) * amp * 0.45)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function glowDot(ctx, x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalAlpha = a
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 7)
  ctx.fill()
  ctx.globalAlpha = 1
}

const PAINT = [
  // Orbit 9: lengkung planet dan stasiun
  (c, w, h) => {
    c.fillStyle = '#03050B'
    c.fillRect(0, 0, w, h)
    const r = rng(21)
    for (let i = 0; i < 280; i++) {
      c.fillStyle = 'rgba(255,255,255,' + (0.25 + r() * 0.7).toFixed(2) + ')'
      const sz = r() < 0.08 ? 3 : 1.6
      c.fillRect(r() * w, r() * h * 0.78, sz, sz)
    }
    const cx = w * 0.46, cy = h * 2.55, R = h * 1.85
    const halo = c.createRadialGradient(cx, cy, R * 0.99, cx, cy, R * 1.1)
    halo.addColorStop(0, 'rgba(150,205,255,.6)')
    halo.addColorStop(1, 'rgba(150,205,255,0)')
    c.fillStyle = halo
    c.beginPath()
    c.arc(cx, cy, R * 1.1, 0, 7)
    c.fill()
    const body = c.createLinearGradient(0, h * 0.7, 0, h)
    body.addColorStop(0, '#2A5E8F')
    body.addColorStop(0.25, '#10294A')
    body.addColorStop(1, '#050B16')
    c.fillStyle = body
    c.beginPath()
    c.arc(cx, cy, R, 0, 7)
    c.fill()
    glowDot(c, w * 0.72, h * 0.715, 260, '#FFE9C2', 0.75)
    c.fillStyle = '#05070C'
    c.fillRect(w * 0.27, h * 0.36, 150, 9)
    c.fillRect(w * 0.27 + 60, h * 0.36 - 30, 9, 70)
    c.fillRect(w * 0.27 + 8, h * 0.36 - 16, 40, 40)
    c.fillRect(w * 0.27 + 100, h * 0.36 - 16, 40, 40)
    glowDot(c, w * 0.27 + 64, h * 0.36 + 4, 40, '#FFD79A', 0.7)
  },
  // stasiun senja
  (c, w, h) => {
    sky(c, w, h, [[0, '#2c2a55'], [0.5, '#c4573f'], [1, '#f0a35a']])
    glowDot(c, w * 0.3, h * 0.55, 220, '#ffd9a0', 0.9)
    c.fillStyle = '#17121c'
    c.fillRect(0, h * 0.72, w, h * 0.28)
    c.strokeStyle = '#3b3140'
    c.lineWidth = 5
    for (let i = -3; i <= 3; i++) {
      c.beginPath()
      c.moveTo(w * 0.5 + i * 40, h * 0.72)
      c.lineTo(w * 0.5 + i * 420, h)
      c.stroke()
    }
    c.fillStyle = '#0d0a10'
    c.fillRect(w * 0.29, h * 0.38, 8, h * 0.34)
    c.fillRect(w * 0.27, h * 0.37, 40, 10)
    ridge(c, w, h * 0.7, 18, 0.004, 0.02, 2, '#120d16', h)
  },
  // pasar malam
  (c, w, h) => {
    sky(c, w, h, [[0, '#120a22'], [0.7, '#3a1850'], [1, '#6b2a6a']])
    const r = rng(9)
    c.fillStyle = '#0a0612'
    for (let i = 0; i < 9; i++) {
      const x = i * 250 - 40, y = h * 0.62
      c.beginPath()
      c.moveTo(x, h)
      c.lineTo(x + 110, y - r() * 60)
      c.lineTo(x + 220, h)
      c.fill()
    }
    for (let k = 0; k < 46; k++) {
      glowDot(c, 60 + k * 43, h * 0.3 + Math.sin(k * 0.7) * 40 + (k % 2) * 14, 38, k % 3 ? '#ffb347' : '#ff6fb5', 0.85)
    }
  },
  // kedai hujan
  (c, w, h) => {
    sky(c, w, h, [[0, '#3a2418'], [1, '#c2783a']])
    const r = rng(4)
    for (let i = 0; i < 38; i++) {
      glowDot(c, r() * w, h * 0.25 + r() * h * 0.6, 40 + r() * 70, ['#ffd28a', '#ff9d5c', '#fff0c2'][i % 3], 0.5)
    }
    c.strokeStyle = 'rgba(255,255,255,.22)'
    c.lineWidth = 2
    for (let j = 0; j < 160; j++) {
      const x = r() * w, y = r() * h
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x - 8, y + 54)
      c.stroke()
    }
    c.fillStyle = '#1a0f0a'
    c.fillRect(0, h * 0.86, w, h * 0.14)
  },
  // jalan balap
  (c, w, h) => {
    sky(c, w, h, [[0, '#1b2a55'], [0.55, '#ff7a3d'], [1, '#ffcf70']])
    c.fillStyle = '#14131a'
    c.beginPath()
    c.moveTo(0, h)
    c.lineTo(w * 0.46, h * 0.56)
    c.lineTo(w * 0.54, h * 0.56)
    c.lineTo(w, h)
    c.fill()
    c.strokeStyle = '#f5e8c8'
    c.lineWidth = 6
    c.setLineDash([36, 44])
    c.beginPath()
    c.moveTo(w * 0.5, h * 0.56)
    c.lineTo(w * 0.5, h)
    c.stroke()
    c.setLineDash([])
    ridge(c, w, h * 0.55, 14, 0.006, 0.02, 1, '#0d0c12', h * 0.58)
    glowDot(c, w * 0.5, h * 0.82, 120, '#ff3b3b', 0.7)
  },
]

export function paintStill(ctx, index, w, h) {
  PAINT[index % PAINT.length](ctx, w, h)
}