import { useState } from 'react'
import { X, ZoomIn } from 'lucide-react'
import InstagramIcon from '../components/InstagramIcon'
import { useStore } from '../context/StoreContext'

const TAGS = ['All', 'Frontal Install', 'Colour Treatment', 'Machine Wigging', 'Revamp', 'Lash Extension', 'Nail Fix']

export default function Gallery() {
  const { gallery } = useStore()
  const [lightbox, setLightbox] = useState(null)
  const [tag, setTag] = useState('All')

  const filtered = tag === 'All' ? gallery : gallery.filter(img =>
    img.caption?.toLowerCase().includes(tag.toLowerCase())
  )

  return (
    <div className="pt-24 min-h-screen">
      {/* Header */}
      <div className="relative bg-brand-card border-b border-brand-border py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/5 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <p className="section-subtitle">Our Work</p>
          <h1 className="section-title text-4xl md:text-5xl">
            The <span className="text-gradient">Gallery</span>
          </h1>
          <p className="text-gray-400 font-poppins mt-3 max-w-lg mx-auto">
            Every client. Every style. Every transformation — captured with pride.
          </p>
        </div>
      </div>

      <div className="page-section">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {TAGS.map(t => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-4 py-2 rounded-full text-sm font-poppins font-medium transition-all ${
                tag === t
                  ? 'bg-brand-pink text-white'
                  : 'glass-card text-gray-400 hover:text-white hover:border-brand-pink/30'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 font-poppins">No photos in this category yet.</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {filtered.map((img, i) => (
              <div
                key={img.id}
                className="break-inside-avoid group relative overflow-hidden rounded-xl cursor-pointer"
                onClick={() => setLightbox(img)}
              >
                <img
                  src={img.url}
                  alt={img.caption || 'Gallery image'}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  {img.caption && (
                    <p className="text-white text-xs font-poppins font-semibold">{img.caption}</p>
                  )}
                  <ZoomIn size={18} className="text-white/70 absolute top-3 right-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instagram CTA */}
        <div className="mt-14 text-center">
          <p className="text-gray-400 font-poppins mb-4">See more of our work on Instagram</p>
          <a
            href="https://www.instagram.com/22artistry_luxuryhairs"
            target="_blank"
            rel="noreferrer"
            className="btn-outline inline-flex items-center gap-2"
          >
            <InstagramIcon size={16} /> @22artistry_luxuryhairs
          </a>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X size={30} />
          </button>
          <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={lightbox.url}
              alt={lightbox.caption}
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
            {lightbox.caption && (
              <p className="text-center text-gray-300 font-poppins mt-4">{lightbox.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
