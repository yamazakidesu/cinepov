import { rupiah } from '../lib/format'

const MAX = 6

export default function BookBar({ picked, full, onOrder }) {
  // picked: kursi terpilih (objek lengkap dari API), kursi terakhir = yang sedang disorot
  const focus = picked[picked.length - 1]
  const total = picked.reduce((sum, s) => sum + s.price, 0)

  return (
    <div className="bar">
      <div className="bar-top">
        {focus ? (
          <div className="bar-info">
            <p className="bar-seat">
              Kursi {focus.label}
              <span> · {focus.kind === 'lounge' ? 'Lounge' : 'Standar'}</span>
            </p>
            <p className="bar-facts">
              {focus.distance_m.toLocaleString('id-ID')} m dari layar · sudut pandang {focus.view_angle_deg}° · {focus.zone}
            </p>
          </div>
        ) : (
          <p className="bar-hint">Pilih kursi untuk melihat jarak dan sudut pandangnya.</p>
        )}

        {full && <p className="bar-warn">Maksimal {MAX} kursi per pesanan.</p>}
      </div>

      <div className="bar-action">
        <div>
          <p className="bar-count">{picked.length ? `${picked.length} kursi` : 'Belum ada kursi'}</p>
          <p className="bar-total">{rupiah(total)}</p>
        </div>
        <button className="btn" disabled={!picked.length} onClick={onOrder}>
          Pesan
        </button>
      </div>
    </div>
  )
}

export { MAX }