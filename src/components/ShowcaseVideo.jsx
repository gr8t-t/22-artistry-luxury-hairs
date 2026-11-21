import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { videoSrc, videoPoster } from '../lib/video'

/**
 * "Our work" - one edited video that plays on a loop, muted, inside a glass frame whose
 * edges fade softly into the page (vignette), so it blends instead of sitting in a box.
 * Hidden entirely until a video has been uploaded.
 */
export default function ShowcaseVideo() {
  const { video } = useStore()
  const wrapRef = useRef(null)
  const vidRef = useRef(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [ratio, setRatio] = useState(null)       // width / height, known once metadata loads
  const [ready, setReady] = useState(false)      // first frame painted
  const [needsTap, setNeedsTap] = useState(!!reduced)
  const [useOriginal, setUseOriginal] = useState(false)
  const [failed, setFailed] = useState(false)

  const url = video?.url
  useEffect(() => { setRatio(null); setReady(false); setUseOriginal(false); setFailed(false) }, [url])

  // iOS only autoplays when the *attribute* is muted, so set it on the element itself.
  useEffect(() => {
    const v = vidRef.current
    if (!v) return
    v.muted = true
    v.defaultMuted = true
    v.setAttribute('muted', '')
  }, [url, useOriginal])

  // Play while on screen, pause when scrolled away (saves battery and data).
  useEffect(() => {
    const el = wrapRef.current
    if (!el || !url) return
    const io = new IntersectionObserver(([entry]) => {
      const v = vidRef.current
      if (!v) return
      if (entry.isIntersecting && !reduced) {
        const p = v.play()
        if (p?.catch) p.catch(() => setNeedsTap(true))
      } else {
        v.pause()
      }
    }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [url, reduced, useOriginal])

  if (!url || failed) return null

  const portrait = ratio ? ratio < 1 : true
  const maxW = portrait ? 440 : 980
  const aspect = ratio || 4 / 5

  const start = () => {
    const v = vidRef.current
    if (!v) return
    v.play().then(() => setNeedsTap(false)).catch(() => {})
  }

  return (
    <section className="relative px-5 md:px-10 py-16 md:py-24" aria-label="Our work">
      <div className="max-w-6xl mx-auto text-center mb-10">
        <p className="eyebrow mb-3">Our work</p>
        <h2 className="display-md">Beauty, <span className="text-gradient">in motion</span></h2>
      </div>

      <div
        ref={wrapRef}
        className="relative mx-auto"
        style={{ width: `min(100%, ${maxW}px, calc(78vh * ${aspect}))`, aspectRatio: aspect }}
      >
        {/* soft pink aura behind the frame */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{ inset: '-12%', background: 'radial-gradient(closest-side, rgba(228,21,107,0.32), transparent 72%)', filter: 'blur(26px)' }}
        />

        {/* glass frame */}
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius: 30,
            border: '1px solid rgba(255,255,255,0.14)',
            background: '#0a0006',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 34px 90px rgba(0,0,0,0.6)',
          }}
        >
          <video
            key={`${url}-${useOriginal}`}
            ref={vidRef}
            src={useOriginal ? url : videoSrc(url)}
            poster={videoPoster(url)}
            muted
            loop
            playsInline
            autoPlay={!reduced}
            preload="auto"
            disablePictureInPicture
            controlsList="nodownload noplaybackrate noremoteplayback"
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: ready ? 1 : 0, transition: 'opacity .8s ease' }}
            onLoadedMetadata={(e) => {
              const { videoWidth: w, videoHeight: h } = e.currentTarget
              if (w && h) setRatio(w / h)
            }}
            onLoadedData={() => setReady(true)}
            onPlaying={() => setNeedsTap(false)}
            onError={() => (useOriginal ? setFailed(true) : setUseOriginal(true))}
          />

          {/* vignette: the edges dissolve into the page */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(8,0,5,0.5) 70%, rgba(8,0,5,0.96) 100%)' }} />
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 70px 26px rgba(8,0,5,0.92)', borderRadius: 30 }} />
          {/* glass sheen */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 26%)' }} />

          {needsTap && (
            <button
              onClick={start}
              aria-label="Play video"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 10px 30px rgba(0,0,0,0.5)',
                }}
              >
                <Play size={30} className="text-white" fill="white" />
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
