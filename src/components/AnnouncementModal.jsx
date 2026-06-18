import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../context/StoreContext'

export default function AnnouncementModal() {
  const { announcements } = useStore()
  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState(null)

  useEffect(() => {
    const now = new Date()
    const ann = announcements.find(a => new Date(a.expiresAt) > now)
    if (!ann) return

    const key = `ann_seen_${ann.id}`
    if (sessionStorage.getItem(key)) return

    setActive(ann)
    setTimeout(() => setVisible(true), 600)
  }, [announcements])

  const close = () => {
    if (active) sessionStorage.setItem(`ann_seen_${active.id}`, '1')
    setVisible(false)
  }

  if (!active) return null

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-500 ${
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${
          visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        style={{ background: '#120009', border: '1px solid rgba(228,21,107,0.35)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onMouseEnter={e => e.currentTarget.style.background = '#E4156B'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
        >
          <X size={16} />
        </button>

        {/* Pink accent line */}
        <div className="h-1 w-full bg-pink-gradient" />

        {/* Flyer image */}
        {active.imageUrl && (
          <div className="w-full" style={{ maxHeight: 420, overflow: 'hidden' }}>
            <img
              src={active.imageUrl}
              alt="Announcement"
              className="w-full h-full object-cover"
              style={{ maxHeight: 420 }}
            />
          </div>
        )}

        {/* Text content */}
        {(active.title || active.message) && (
          <div className="px-7 pt-6 pb-2">
            {active.title && (
              <h3
                className="text-white font-bold text-2xl leading-snug"
                style={{ fontFamily: '"Cormorant Garant"' }}
              >
                {active.title}
              </h3>
            )}
            {active.message && (
              <p className="text-gray-400 text-sm mt-2 leading-relaxed font-poppins">
                {active.message}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-7 py-6 flex gap-3">
          <button
            onClick={close}
            className="flex-1 btn-primary"
          >
            View Offer
          </button>
          <button
            onClick={close}
            className="btn-ghost text-gray-500 hover:text-gray-300"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
