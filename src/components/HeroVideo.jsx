import { useEffect, useRef, useState } from 'react'

const SRC = '/hero-v1.mp4'
const POSTER = '/hero-poster-v1.jpg'

/** True when the screen matches a CSS media query (and keeps up when it changes). */
export function useMedia(query) {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatches(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return matches
}

/** The video is a nicety: skip it for people who asked for less motion, are saving data, or are on a very slow connection. */
function videoAllowed() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    const c = navigator.connection
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return false
  } catch { /* if we cannot tell, allow it */ }
  return true
}

/**
 * Looping, silent salon video for the home hero.
 * - Phones and tablets: full-screen background under a faded black cover.
 * - Large screens: a framed vertical panel (the video is portrait, so it stays sharp).
 * It only starts loading once the page has settled, pauses when scrolled away, and the photo stays as the fallback.
 */
export default function HeroVideo({ onPlayingChange }) {
  const wide = useMedia('(min-width: 1024px)')
  const [go, setGo] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const ref = useRef(null)
  const report = useRef(onPlayingChange)
  report.current = onPlayingChange

  // wait until the page has loaded so the video never slows down the first paint
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
    v.play()?.catch?.(() => { /* autoplay blocked (for example low-power mode): the photo stays */ })
    // do not burn battery when the hero is off screen or the tab is hidden
    let inView = true
    const sync = () => { if (inView && !document.hidden) v.play()?.catch?.(() => {}); else v.pause() }
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync() }, { threshold: 0.05 })
    io.observe(v)
    document.addEventListener('visibilitychange', sync)
    return () => { v.removeEventListener('playing', on); io.disconnect(); document.removeEventListener('visibilitychange', sync) }
  }, [go, wide])

  useEffect(() => { report.current?.(playing && !failed, wide) }, [playing, failed, wide])

  if (!go || failed) return null

  const video = (
    <video
      ref={ref}
      muted loop playsInline autoPlay preload="auto"
      poster={wide ? POSTER : undefined}
      aria-hidden="true" tabIndex={-1}
      disablePictureInPicture disableRemotePlayback
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover transition-opacity duration-1000 ${playing || wide ? 'opacity-100' : 'opacity-0'}`}
    >
      <source src={SRC} type="video/mp4" />
    </video>
  )

  if (wide) {
    return (
      <div
        className="absolute z-10 right-[6%] top-1/2 -translate-y-1/2 w-[300px] xl:w-[340px] rounded-3xl overflow-hidden border border-white/15"
        style={{ aspectRatio: '9 / 16', boxShadow: '0 30px 90px rgba(0,0,0,0.65), 0 0 60px rgba(228,21,107,0.12)' }}
        aria-hidden="true"
      >
        {video}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(8,0,5,0.55), transparent 35%)' }} />
      </div>
    )
  }

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {video}
      {/* the faded black cover that keeps the headline easy to read */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${playing ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'rgba(8,0,5,0.46)' }} />
    </div>
  )
}
