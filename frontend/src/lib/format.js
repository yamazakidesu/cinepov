export const rupiah = (n) => 'Rp' + n.toLocaleString('id-ID')

export const jam = (iso) => iso.slice(11, 16)

const hari = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })

export function labelHari(iso) {
  const d = new Date(iso.slice(0, 10) + 'T00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selisih = Math.round((d - today) / 86400000)
  if (selisih === 0) return 'Hari ini'
  if (selisih === 1) return 'Besok'
  return hari.format(d)
}

export const durasi = (min) => `${Math.floor(min / 60)}j ${min % 60}m`