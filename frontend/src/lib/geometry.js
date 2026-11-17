// Rumus geometri studio. HARUS sama dengan backend (seat_x, seat_z, view_angle_deg di app.py).
// Satuan meter. x = jarak dari garis tengah layar (negatif = kiri), z = jarak ke layar.

export function aisleCount(hall) {
  return hall.aisle_after.filter((a) => a < hall.cols).length
}

export function seatX(hall, col) {
  const pitch = hall.seat_pitch_m
  const total = (hall.cols + aisleCount(hall)) * pitch // lebar lorong = satu kursi
  const gaps = hall.aisle_after.filter((a) => col > a).length
  return (col - 1) * pitch + gaps * pitch + pitch / 2 - total / 2
}

export const seatZ = (hall, rowIndex) => hall.front_distance_m + rowIndex * hall.row_pitch_m

export const floorY = (hall, rowIndex) => rowIndex * hall.riser_m

export const rad = (d) => (d * Math.PI) / 180
export const deg = (r) => (r * 180) / Math.PI
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// angle from seat to screen, in radian. 0 = lurus ke layar, positif = ke kanan, negatif = ke kiri
export function screenAngle(hall, x, z) {
  const half = hall.screen_width_m / 2
  return Math.atan2(half - x, z) - Math.atan2(-half - x, z)
}