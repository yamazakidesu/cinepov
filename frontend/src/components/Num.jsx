import { useLayoutEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'motion/react'

export default function Num({ value, format = String, play = true, duration = 0.7, delay = 0 }) {
  const el = useRef(null)
  const shown = useRef(0) // angka yang terakhir tampil di layar
  const reduce = useReducedMotion()

  useLayoutEffect(() => {
    const node = el.current
    if (!play) {
      node.textContent = format(shown.current)
      return
    }
    if (reduce) {
      shown.current = value
      node.textContent = format(value)
      return
    }
    const controls = animate(shown.current, value, {
      duration,
      delay,
      ease: 'easeOut',
      onUpdate: (v) => {
        shown.current = v
        node.textContent = format(v)
      },
    })
    return () => controls.stop()
  }, [value, play, reduce, duration, delay, format])

  return <span ref={el} />
}