import * as THREE from 'three'
import { clamp, deg, floorY, rad, screenAngle, seatX, seatZ } from './geometry'
import { paintStill } from './stills'

// Tampilan mirip three.js lama (tanpa konversi warna sRGB dan lampu "fisik")
THREE.ColorManagement.enabled = false
const PI = Math.PI

const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)

function quatLook(pos, target, up) {
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, target, up))
}

function roundedShape(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  s.moveTo(x + r, 0)
  s.lineTo(x + w - r, 0)
  s.absarc(x + w - r, r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, h - r)
  s.absarc(x + w - r, h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, h)
  s.absarc(x + r, h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, r)
  s.absarc(x + r, r, r, Math.PI, 1.5 * Math.PI, false)
  return s
}

export class HallScene {
  constructor(canvas) {
    this.canvas = canvas
    this.reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    this.W = 390
    this.H = 844
    this.hall = null
    this.seatMeshes = {}
    this.selected = new Set()
    this.flight = null
    this.raf = 0

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x050403, 1)
    this.renderer = renderer
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(30, 0.5, 0.1, 160)

    // cahaya
    this.scene.add(new THREE.HemisphereLight(0xc9b08c, 0x0a0806, 0.5 * PI))
    const sun = new THREE.DirectionalLight(0xffe8cc, 0.55 * PI)
    sun.position.set(2, 14, 18)
    this.scene.add(sun)
    this.spill = new THREE.PointLight(0xffe6c4, 0.7 * PI * 12, 30, 1.6)
    this.scene.add(this.spill)

    const room = new THREE.Mesh(
      new THREE.BoxGeometry(15, 9, 22),
      new THREE.MeshLambertMaterial({ color: 0x0c0a08, side: THREE.BackSide }),
    )
    room.position.set(0, 4.5, 9.5)
    this.scene.add(room)

    // bahan
    this.floorA = new THREE.MeshLambertMaterial({ color: 0x17120e })
    this.floorB = new THREE.MeshLambertMaterial({ color: 0x120e0b })
    this.velvet = new THREE.MeshStandardMaterial({ color: 0x14594a, roughness: 0.95, metalness: 0 })
    this.leather = new THREE.MeshStandardMaterial({ color: 0x86522b, roughness: 0.6, metalness: 0.05 })
    this.brass = new THREE.MeshStandardMaterial({ color: 0xe0be80, roughness: 0.45, metalness: 0.15, emissive: 0x4a3714 })
    this.wood = new THREE.MeshStandardMaterial({ color: 0x2a1b10, roughness: 0.6 })

    this.backGeo = new THREE.ExtrudeGeometry(roundedShape(0.5, 0.62, 0.09), {
      depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6,
    })
    this.cushGeo = new THREE.BoxGeometry(0.48, 0.1, 0.4)
    this.armGeo = new THREE.BoxGeometry(0.06, 0.08, 0.5)

    // layar
    this.screenCanvas = document.createElement('canvas')
    this.screenCanvas.width = 2048
    this.screenCanvas.height = 860
    this.screenTex = new THREE.CanvasTexture(this.screenCanvas)
    this.screenTex.repeat.set(0.92, 1)
    this.screenTex.offset.set(0.04, 0)

    this.hallGroup = null
    this._loop = this._loop.bind(this)
  }

  /* ---------- isi studio dari data API ---------- */
  setHall(hall, seats, stillIndex) {
    this.hall = hall
    if (this.hallGroup) {
      this.scene.remove(this.hallGroup)
      this.hallGroup.traverse((o) => {
        if (o.userData.own) o.geometry.dispose()
      })
    }
    const g = new THREE.Group()
    this.hallGroup = g
    this.seatMeshes = {}

    const loungeRows = new Set(seats.filter((s) => s.kind === 'lounge').map((s) => ROW_LABELS.indexOf(s.row)))
    const sx = (c) => seatX(hall, c)

    for (let r = 0; r < hall.rows; r++) {
      const z = seatZ(hall, r)
      const top = floorY(hall, r)
      const hgt = Math.max(top, 0.05)
      const step = new THREE.Mesh(new THREE.BoxGeometry(14.6, hgt, hall.row_pitch_m), r % 2 ? this.floorA : this.floorB)
      step.userData.own = true
      step.position.set(0, hgt / 2, z)
      g.add(step)

      const mat = loungeRows.has(r) ? this.leather : this.velvet
      for (let c = 1; c <= hall.cols; c++) {
        const back = new THREE.Mesh(this.backGeo, mat)
        back.position.set(sx(c), top + 0.34, z + 0.15)
        const cush = new THREE.Mesh(this.cushGeo, mat)
        cush.position.set(sx(c), top + 0.36, z - 0.1)
        const arm = new THREE.Mesh(this.armGeo, this.wood)
        arm.position.set(sx(c) + hall.seat_pitch_m / 2 - 0.02, top + 0.52, z - 0.02)
        g.add(back, cush, arm)
        if (c === 1 || hall.aisle_after.includes(c - 1)) {
          const arm2 = new THREE.Mesh(this.armGeo, this.wood)
          arm2.position.set(sx(c) - hall.seat_pitch_m / 2 + 0.02, top + 0.52, z - 0.02)
          g.add(arm2)
        }
        this.seatMeshes[ROW_LABELS[r] + c] = { back, cush, mat }
      }
    }

    const cy = hall.screen_bottom_m + hall.screen_height_m / 2
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(hall.screen_width_m, hall.screen_height_m),
      new THREE.MeshBasicMaterial({ map: this.screenTex }),
    )
    screen.userData.own = true
    screen.position.set(0, cy, 0.03)
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(hall.screen_width_m + 0.5, hall.screen_height_m + 0.5, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x020202 }),
    )
    frame.userData.own = true
    frame.position.set(0, cy, -0.05)
    g.add(screen, frame)
    this.scene.add(g)

    this.spill.position.set(0, cy, 2.5)
    this.setStill(stillIndex)
    this._colorSeats()
    this.render()
  }

  setStill(index) {
    const ctx = this.screenCanvas.getContext('2d')
    const { width: w, height: h } = this.screenCanvas
    ctx.clearRect(0, 0, w, h)
    paintStill(ctx, index, w, h)
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.4, w / 2, h / 2, w * 0.62)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,.5)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    this.screenTex.needsUpdate = true
  }

  setSelected(labels) {
    this.selected = new Set(labels)
    this._colorSeats()
    this.render()
  }

  _colorSeats() {
    for (const [label, o] of Object.entries(this.seatMeshes)) {
      const m = this.selected.has(label) ? this.brass : o.mat
      o.back.material = m
      o.cush.material = m
    }
  }

  /* ---------- kamera ---------- */
  resize() {
    this.W = Math.max(this.canvas.clientWidth, 1)
    this.H = Math.max(this.canvas.clientHeight, 1)
    this.renderer.setSize(this.W, this.H, false)
    this.camera.aspect = this.W / this.H
    this.camera.updateProjectionMatrix()
  }

  applyPose(p) {
    this.camera.position.copy(p.pos)
    this.camera.quaternion.copy(p.quat)
    this.camera.fov = p.fov
    this.camera.updateProjectionMatrix()
  }

  currentPose() {
    return { pos: this.camera.position.clone(), quat: this.camera.quaternion.clone(), fov: this.camera.fov }
  }

  // Tampilan atas yang menempel tepat pada denah 2D di layar.
  // a, b = titik tengah kursi pertama (A1) dan terakhir, dalam piksel relatif terhadap canvas.
  overheadPose(a, b) {
    const hall = this.hall
    const last = hall.rows - 1
    const ppm =
      ((b.x - a.x) / (seatX(hall, hall.cols) - seatX(hall, 1)) + (b.y - a.y) / (seatZ(hall, last) - seatZ(hall, 0))) / 2
    const fov = 22
    const yRef = 1.8
    const dist = this.H / ppm / 2 / Math.tan(rad(fov / 2))
    const cx = seatX(hall, 1) - (a.x - this.W / 2) / ppm
    const cz = seatZ(hall, 0) - (a.y - this.H / 2) / ppm
    const pos = new THREE.Vector3(cx, yRef + dist, cz)
    const tgt = new THREE.Vector3(cx, 0, cz)
    return { pos, quat: quatLook(pos, tgt, new THREE.Vector3(0, 0, -1)), fov }
  }

  // Posisi mata penonton di kursi (row index r, kolom c), menghadap layar.
  povPose(r, c, desktop) {
    const hall = this.hall
    const x = seatX(hall, c)
    const z = seatZ(hall, r) + 0.1
    const eye = new THREE.Vector3(x, floorY(hall, r) + 1.12, z)
    const aspect = this.W / this.H
    const hfov = clamp(deg(screenAngle(hall, x, z)) + 6, 54, 96)
    const vfov = Math.min(deg(2 * Math.atan(Math.tan(rad(hfov) / 2) / aspect)), 112)
    const sy = hall.screen_bottom_m + hall.screen_height_m / 2
    const flat = Math.hypot(x, z)
    const e = Math.atan2(sy - eye.y, flat)
    const a = Math.atan((desktop ? 0.34 : 0.46) * Math.tan(rad(vfov) / 2))
    const pitch = e - a
    const dir = new THREE.Vector3(-x, 0, -z).normalize()
    const tgt = eye.clone().add(new THREE.Vector3(dir.x * Math.cos(pitch), Math.sin(pitch), dir.z * Math.cos(pitch)))
    return { pos: eye, quat: quatLook(eye, tgt, new THREE.Vector3(0, 1, 0)), fov: vfov }
  }

  /* ---------- animasi ---------- */
  fly(from, to, dur, done) {
    if (this.reduce) {
      this.applyPose(to)
      this.render()
      done?.()
      return
    }
    this.flight = { t0: performance.now(), dur, from, to, done }
  }

  _loop(now) {
    this.raf = requestAnimationFrame(this._loop)
    const f = this.flight
    if (f) {
      const k = clamp((now - f.t0) / f.dur, 0, 1)
      const e = easeInOut(k)
      this.camera.position.lerpVectors(f.from.pos, f.to.pos, e)
      this.camera.quaternion.slerpQuaternions(f.from.quat, f.to.quat, e)
      this.camera.fov = f.from.fov + (f.to.fov - f.from.fov) * e
      this.camera.updateProjectionMatrix()
      if (k >= 1) {
        this.flight = null
        f.done?.()
      }
    }
    if (!this.reduce) this.screenTex.offset.x = 0.04 + 0.035 * Math.sin(now / 5200)
    this.renderer.render(this.scene, this.camera)
  }

  start() {
    if (!this.raf) this.raf = requestAnimationFrame(this._loop)
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.stop()
    this.renderer.dispose()
  }
}