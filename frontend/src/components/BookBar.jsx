import { AnimatePresence, motion } from 'motion/react'
import { rupiahBulat } from '../lib/format'
import Num from './Num'
import { spring } from '../lib/motion'

const MAX = 6

export default function BookBar({ picked, notice, onOrder, onRemove }) {
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

        {notice && <p className="bar-warn" role="status">{notice}</p>}
      </div>

      <div className="bar-action">
        <div className="bar-left">
          <div className="bar-picked">
            {picked.length === 0 ? (
              <p className="bar-count">Belum ada kursi</p>
            ) : (
              <ul className="picked-list" aria-label={`${picked.length} kursi dipilih`}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {picked.map((s) => (
                    <motion.li
                      key={s.label}
                      layout
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={spring}
                    >
                      <button
                        className="pick"
                        title="Klik untuk batalkan"
                        aria-label={`Batalkan kursi ${s.label}`}
                        onClick={() => onRemove(s)}
                      >
                        {s.label}
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
          <p className="bar-total"><Num value={total} format={rupiahBulat} duration={0.45} /></p>
        </div>
        <button className="btn" disabled={!picked.length} onClick={onOrder}>Pesan</button>
      </div>
    </div>
  )
}

export { MAX }