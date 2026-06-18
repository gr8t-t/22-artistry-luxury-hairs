import { useStore } from '../context/StoreContext'
import { Megaphone, Clock, CalendarX } from 'lucide-react'

function Countdown({ expiresAt }) {
  const now = new Date()
  const end = new Date(expiresAt)
  const diff = end - now

  if (diff <= 0) return <span className="text-gray-600 text-xs font-poppins">Ended</span>

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <span className="text-brand-pink text-xs font-poppins font-medium">
      {days > 0 ? `${days}d ` : ''}{hours}h {minutes}m left
    </span>
  )
}

export default function Announcements() {
  const { announcements } = useStore()
  const now = new Date()

  const active = announcements.filter(a => new Date(a.expiresAt) > now)
  const past   = announcements.filter(a => new Date(a.expiresAt) <= now)

  return (
    <div className="pt-24 min-h-screen">
      {/* Header */}
      <div
        className="relative py-16 md:py-20 text-center overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #120009 0%, #080005 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(228,21,107,0.08) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 page-section py-0">
          <p className="eyebrow mb-3">Stay in the Loop</p>
          <h1 className="display-lg">
            Events &amp; <span className="text-gradient">Announcements</span>
          </h1>
          <p className="body-copy mt-4 max-w-md mx-auto">
            Sales, giveaways, and special offers — all in one place.
          </p>
        </div>
      </div>

      <div className="page-section">

        {/* Active announcements */}
        {active.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="eyebrow" style={{ color: '#4ade80' }}>Live Now</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...active].reverse().map(a => (
                <div
                  key={a.id}
                  className="rounded-2xl overflow-hidden border border-brand-pink/25 card-hover"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  {a.imageUrl ? (
                    <div className="relative overflow-hidden" style={{ paddingBottom: '100%' }}>
                      <img
                        src={a.imageUrl}
                        alt={a.title || 'Announcement'}
                        className="absolute inset-0 w-full h-full object-cover"
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        style={{ transition: 'transform 0.5s ease' }}
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 h-24"
                        style={{ background: 'linear-gradient(to top, rgba(8,0,5,0.9), transparent)' }}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center"
                      style={{ height: 180, background: 'linear-gradient(135deg, #1a000f, #2A0818)' }}
                    >
                      <Megaphone size={40} className="text-brand-pink opacity-40" />
                    </div>
                  )}

                  <div className="p-5">
                    {a.title && (
                      <h3
                        className="text-white font-semibold text-xl leading-snug"
                        style={{ fontFamily: '"Cormorant Garant"' }}
                      >
                        {a.title}
                      </h3>
                    )}
                    {a.message && (
                      <p className="text-gray-400 font-poppins text-sm mt-2 leading-relaxed">
                        {a.message}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-brand-border/40">
                      <Clock size={13} className="text-brand-pink shrink-0" />
                      <Countdown expiresAt={a.expiresAt} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {active.length === 0 && (
          <div className="text-center py-20">
            <Megaphone size={48} className="text-brand-border mx-auto mb-4" />
            <h3 className="display-md mb-3">No Active Announcements</h3>
            <p className="body-copy max-w-sm mx-auto">
              Check back soon — upcoming sales and events will appear here.
            </p>
          </div>
        )}

        {/* Past events */}
        {past.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <CalendarX size={16} className="text-gray-600" />
              <p className="eyebrow" style={{ color: '#555' }}>Past Events</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 opacity-50">
              {[...past].reverse().map(a => (
                <div
                  key={a.id}
                  className="rounded-xl overflow-hidden border border-brand-border/40"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  {a.imageUrl ? (
                    <div className="relative overflow-hidden" style={{ paddingBottom: '100%' }}>
                      <img
                        src={a.imageUrl}
                        alt={a.title || ''}
                        className="absolute inset-0 w-full h-full object-cover grayscale"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center" style={{ height: 100 }}>
                      <Megaphone size={24} className="text-gray-700" />
                    </div>
                  )}
                  {a.title && (
                    <p className="text-gray-500 font-poppins text-xs p-3 truncate">{a.title}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
