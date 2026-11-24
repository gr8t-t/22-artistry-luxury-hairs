import { useEffect, useRef, useState } from 'react'
import { HERO_PHOTOS } from '../lib/heroImages'

const SRC = '/hero-v1.mp4'
const POSTER = '/hero-poster-v1.jpg'
const VIDEO = '__video__'
const rand = (a, b) => a + Math.random() * (b - a)

const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

/** The video is a nicety: skip it for people who asked for less motion, are saving data, or are on a very slow connection. */
function videoAllowed() {
  try {
    if (reducedMotion()) return false
    const c = navigator.connection
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return false
  } catch { /* if we cannot tell, allow it */ }
  return true
}

/** Arch shape with a thin light border and a soft pink glow. */
function Arch({ className = '', children }) {
  return (
    <div
      className={`relative overflow-hidden bg-brand-card ${className}`}
      style={{
        borderRadius: '9999px 9999px 22px 22px',
        border: '2px solid rgba(255,255,255,0.82)',
        boxShadow: '0 24px 60px rgba(228,21,107,0.16)',
      }}
    >
      {children}
    </div>
  )
}

/** Shows one photo and fades the next one in over it. The old photo is removed once the fade is done. */
function Slide({ src }) {
  const [shown, setShown] = useState({ cur: src, prev: null, fadeOut: false })
  useEffect(() => {
    if (src === shown.cur) return
    setShown({ cur: src, prev: shown.cur, fadeOut: false })
    const raf = requestAnimationFrame(() => setShown(s => ({ ...s, fadeOut: true })))
    const t = setTimeout(() => setShown(s => ({ ...s, prev: null })), 1500)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [src]) // eslint-disable-line react-hooks/exhaustive-deps
  const base = { objectPosition: '50% 22%' }
  const toVideo = shown.cur === VIDEO
  return (
    <>
      {shown.prev && shown.prev !== VIDEO && (
        <img
          key={shown.prev} src={shown.prev} alt="" aria-hidden="true" draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
          // when the next picture is the video, the old photo fades away to reveal it
          style={{ ...base, opacity: toVideo && shown.fadeOut ? 0 : 1, transition: 'opacity 1.3s ease' }}
        />
      )}
      {!toVideo && (
        <img
          key={shown.cur} src={shown.cur} alt="" aria-hidden="true" draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ ...base, animation: shown.prev ? 'fadeIn 1.3s ease forwards' : undefined }}
        />
      )}
    </>
  )
}

/**
 * Silent looping salon video that sits on top of a slot while it is that slot's turn.
 * A still frame shows straight away; the video loads once the page has settled, and pauses when not shown.
 */
function SlotVideo({ active }) {
  const [go, setGo] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!videoAllowed()) return
    let timer
    const start = () => { timer = setTimeout(() => setGo(true), 400) }
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
    return () => { clearTimeout(timer); window.removeEventListener('load', start) }
  }, [])

  useEffect(() => {
    const v = ref.current
    if (!go || !v) return
    v.muted = true // some phones only autoplay when this is set on the element itself
    const on = () => setPlaying(true)
    v.addEventListener('playing', on)
    return () => v.removeEventListener('playing', on)
  }, [go])

  useEffect(() => {
    const v = ref.current
    if (!go || !v) return
    const sync = () => { if (active && !document.hidden) v.play()?.catch?.(() => { /* autoplay blocked: the still stays */ }); else v.pause() }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [go, active])

  return (
    <div className="absolute inset-0 transition-opacity duration-[1300ms]" style={{ opacity: active ? 1 : 0 }}>
      <img src={POSTER} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
      {go && !failed && (
        <video
          ref={ref} muted loop playsInline preload="auto"
          aria-hidden="true" tabIndex={-1} disablePictureInPicture disableRemotePlayback
          onError={() => setFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${playing ? 'opacity-100' : 'opacity-0'}`}
        >
          <source src={SRC} type="video/mp4" />
        </video>
      )}
    </div>
  )
}

/** Picks a random starting picture for each arch: two different photos on the sides, the video in the middle. */
function startingSlides() {
  const pool = [...HERO_PHOTOS].sort(() => Math.random() - 0.5)
  return [pool[0] ?? POSTER, VIDEO, pool[1] ?? pool[0] ?? POSTER]
}

/**
 * Three arches under the headline. Each one keeps swapping to a different picture from a bigger set,
 * on its own timing (about every 3 seconds, never all at once) and in no fixed order.
 * The middle arch also takes the salon video as one of its pictures.
 */
export default function HeroArches() {
  const [slides, setSlides] = useState(startingSlides)
  const live = useRef(slides)
  useEffect(() => { live.current = slides })

  // load every picture in the background once the page has settled, so swaps never flicker
  useEffect(() => {
    const preload = () => HERO_PHOTOS.forEach(s => { const i = new Image(); i.src = s })
    if (document.readyState === 'complete') preload()
    else { window.addEventListener('load', preload, { once: true }); return () => window.removeEventListener('load', preload) }
  }, [])

  useEffect(() => {
    if (reducedMotion() || HERO_PHOTOS.length < 4) return
    const timers = []
    let stopped = false

    const next = (i) => {
      const cur = live.current
      const shownElsewhere = new Set(cur)
      const options = HERO_PHOTOS.filter(p => !shownElsewhere.has(p))
      if (i === 1 && cur[1] !== VIDEO) options.push(VIDEO) // the video comes back round in the middle arch
      return options.length ? options[Math.floor(Math.random() * options.length)] : null
    }

    const tick = (i) => {
      if (stopped) return
      let nowShowing = live.current[i]
      if (!document.hidden) {
        const pick = next(i)
        if (pick) { nowShowing = pick; setSlides(s => s.map((x, n) => (n === i ? pick : x))) }
      }
      // the video stays on screen longer than a photo; every arch has its own slightly different rhythm
      const wait = nowShowing === VIDEO ? rand(8000, 10000) : rand(2600, 3800)
      timers[i] = setTimeout(() => tick(i), wait)
    }

    // staggered start so the arches never change together (the middle one starts on the video, so it stays a while)
    timers[0] = setTimeout(() => tick(0), 2200 + rand(0, 600))
    timers[1] = setTimeout(() => tick(1), 8500 + rand(0, 1200))
    timers[2] = setTimeout(() => tick(2), 3600 + rand(0, 600))
    return () => { stopped = true; timers.forEach(clearTimeout) }
  }, [])

  return (
    <div
      className="mt-12 md:mt-16 grid grid-cols-[1fr_1.15fr_1fr] gap-2.5 sm:gap-4 md:gap-5 items-end w-full max-w-3xl opacity-0"
      style={{ animation: 'fadeUp .9s .85s cubic-bezier(.16,1,.3,1) forwards' }}
    >
      <Arch className="aspect-[3/4.2]"><Slide src={slides[0]} /></Arch>
      <Arch className="aspect-[3/5]">
        <SlotVideo active={slides[1] === VIDEO} />
        <Slide src={slides[1]} />
      </Arch>
      <Arch className="aspect-[3/4.2]"><Slide src={slides[2]} /></Arch>
    </div>
  )
}
