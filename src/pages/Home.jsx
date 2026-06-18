import { Link } from 'react-router-dom'
import { ChevronRight, Star, Sparkles, Scissors, ShoppingBag } from 'lucide-react'
import InstagramIcon from '../components/InstagramIcon'
import { useStore } from '../context/StoreContext'
import { useEffect, useRef } from 'react'

const SERVICES = [
  { icon: '✦', title: 'Professional Colouring', desc: 'Expert colour treatments for vibrant, lasting results that enhance your natural beauty.' },
  { icon: '👑', title: 'Frontal Installs', desc: 'Seamless, natural-looking frontal installations that give you the perfect hairline.' },
  { icon: '✂️', title: 'Machine Wigging', desc: 'Professional machine-made wigs crafted for comfort, durability, and style.' },
  { icon: '💅', title: 'Fixing of Nails', desc: 'Beautiful nail designs and fixes for every occasion.' },
  { icon: '👁️', title: 'Lashes Extension', desc: 'Stunning lash extensions that open and frame your eyes perfectly.' },
  { icon: '🎓', title: 'General Training', desc: 'Learn from our experts and master the art of hair and beauty.' },
]

const STATS = [
  { value: '500+', label: 'Happy Clients' },
  { value: '8+', label: 'Services Offered' },
  { value: '5★', label: 'Average Rating' },
  { value: '3+', label: 'Years of Excellence' },
]

function useIntersect(ref, options = {}) {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0')
          entry.target.classList.remove('opacity-0', 'translate-y-10')
        }
      })
    }, { threshold: 0.15, ...options })
    const els = ref.current?.querySelectorAll('[data-animate]')
    els?.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export default function Home() {
  const { products, addToCart } = useStore()
  const featured = products.filter(p => p.featured).slice(0, 3)
  const statsRef = useRef(null)
  const servicesRef = useRef(null)
  const productsRef = useRef(null)
  useIntersect(statsRef)
  useIntersect(servicesRef)
  useIntersect(productsRef)

  return (
    <div className="flex flex-col">
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1400&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/90 to-brand-black/30" />
        {/* Pink accent glow */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-brand-pink/10 blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 pt-24 pb-16">
          <div className="max-w-2xl">
            <p className="section-subtitle animate-fade-up" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
              Welcome to 22 Artistry
            </p>
            <h1 className="font-playfair text-5xl md:text-7xl font-bold text-white leading-[1.1] animate-fade-up"
              style={{ animationDelay: '0.25s', opacity: 0, animationFillMode: 'forwards' }}>
              Your <span className="text-gradient">Beauty.</span><br />
              Our <span className="text-gradient">Artistry.</span>
            </h1>
            <p className="mt-4 text-xl font-playfair italic text-gray-300 animate-fade-up"
              style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
              Unmatched Luxury.
            </p>
            <p className="mt-5 text-gray-400 font-poppins text-base leading-relaxed max-w-lg animate-fade-up"
              style={{ animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
              Experience premium hair services, luxury hair sales, and beauty treatments all under one roof. Your transformation starts here.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 animate-fade-up"
              style={{ animationDelay: '0.6s', opacity: 0, animationFillMode: 'forwards' }}>
              <Link to="/booking" className="btn-primary animate-pulse-pink flex items-center gap-2">
                Book Appointment <ChevronRight size={16} />
              </Link>
              <Link to="/shop" className="btn-outline flex items-center gap-2">
                Shop Hair <ShoppingBag size={16} />
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex items-center gap-4 animate-fade-up"
              style={{ animationDelay: '0.7s', opacity: 0, animationFillMode: 'forwards' }}>
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-9 h-9 rounded-full border-2 border-brand-black overflow-hidden bg-brand-card">
                    <img src={`https://i.pravatar.cc/40?img=${i+10}`} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-gray-400 text-xs font-poppins mt-0.5">500+ satisfied clients</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
          <p className="text-gray-500 text-xs font-poppins tracking-widest uppercase">Scroll</p>
          <div className="w-px h-10 bg-gradient-to-b from-brand-pink to-transparent" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-brand-card border-y border-brand-border" ref={statsRef}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-brand-border">
            {STATS.map((s, i) => (
              <div
                key={s.value}
                data-animate
                className="text-center opacity-0 translate-y-10 transition-all duration-700"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <p className="font-playfair text-3xl md:text-4xl font-bold text-gradient">{s.value}</p>
                <p className="text-gray-400 text-sm font-poppins mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="page-section" ref={servicesRef}>
        <div className="text-center mb-12">
          <p className="section-subtitle">What We Offer</p>
          <h2 className="section-title">Our <span className="text-gradient">Services</span></h2>
          <p className="text-gray-400 font-poppins mt-3 max-w-xl mx-auto">
            From hair to nails to lashes — we provide a full range of luxury beauty services.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((s, i) => (
            <div
              key={s.title}
              data-animate
              className="glass-card p-6 rounded-2xl card-hover cursor-default opacity-0 translate-y-10 transition-all duration-700 group"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center text-2xl mb-4 group-hover:bg-brand-pink/20 transition-colors">
                {s.icon}
              </div>
              <h3 className="font-playfair text-white font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/booking" className="btn-outline">Book a Service</Link>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      {featured.length > 0 && (
        <section className="py-16 md:py-24 bg-brand-card border-y border-brand-border" ref={productsRef}>
          <div className="page-section pt-0 pb-0">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="section-subtitle">Our Collection</p>
                <h2 className="section-title">Featured <span className="text-gradient">Products</span></h2>
              </div>
              <Link to="/shop" className="text-brand-pink font-poppins text-sm flex items-center gap-1 hover:gap-2 transition-all">
                View all <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((p, i) => (
                <div
                  key={p.id}
                  data-animate
                  className="glass-card rounded-2xl overflow-hidden card-hover opacity-0 translate-y-10 transition-all duration-700"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="relative h-52 overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                    <div className="absolute top-3 left-3 bg-brand-pink text-white text-xs font-poppins font-semibold px-2.5 py-1 rounded-full">
                      {p.category}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-playfair text-white font-semibold text-lg">{p.name}</h3>
                    <p className="text-gray-400 text-sm font-poppins mt-1 line-clamp-2">{p.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-brand-pink font-playfair text-xl font-bold">₦{p.price.toLocaleString()}</span>
                      <button
                        onClick={() => addToCart(p)}
                        className="btn-primary text-sm py-2 px-4"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA BANNER ── */}
      <section className="page-section">
        <div className="relative overflow-hidden rounded-3xl bg-pink-gradient p-10 md:p-14 text-center pink-glow">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <p className="text-white/80 font-poppins text-sm font-semibold tracking-widest uppercase mb-3">Limited Slots Available</p>
            <h2 className="font-playfair text-3xl md:text-5xl font-bold text-white">
              Ready for Your<br />Transformation?
            </h2>
            <p className="text-white/80 font-poppins mt-4 max-w-lg mx-auto">
              Book your appointment today and let our experts craft your perfect look.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Link
                to="/booking"
                className="bg-white text-brand-pink font-poppins font-semibold px-8 py-3 rounded-full hover:bg-brand-blush transition-colors"
              >
                Book Now
              </Link>
              <a
                href="https://wa.me/2349075341220"
                target="_blank"
                rel="noreferrer"
                className="border-2 border-white text-white font-poppins font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-colors"
              >
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── INSTAGRAM ── */}
      <section className="pb-16 md:pb-24 px-4 md:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-8">
          <p className="section-subtitle">Follow Our Journey</p>
          <h2 className="section-title flex items-center justify-center gap-3">
            <InstagramIcon size={28} className="text-brand-pink" />
            @22artistry_luxuryhairs
          </h2>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            'photo-1522337360788-8b13dee7a37e',
            'photo-1560472354-b33ff0c44a43',
            'photo-1595476108010-b4d1f102b1b1',
            'photo-1605497788044-5a32c7078486',
            'photo-1519735777090-ec97162dc266',
            'photo-1516975080664-ed2fc6a32937',
          ].map((id, i) => (
            <a
              key={id}
              href="https://www.instagram.com/22artistry_luxuryhairs"
              target="_blank"
              rel="noreferrer"
              className="aspect-square overflow-hidden rounded-xl group relative"
            >
              <img
                src={`https://images.unsplash.com/${id}?w=300&q=80`}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-brand-pink/0 group-hover:bg-brand-pink/30 transition-colors flex items-center justify-center">
                <InstagramIcon size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
        <div className="text-center mt-6">
          <a
            href="https://www.instagram.com/22artistry_luxuryhairs"
            target="_blank"
            rel="noreferrer"
            className="btn-outline inline-flex items-center gap-2"
          >
            <InstagramIcon size={16} /> Follow on Instagram
          </a>
        </div>
      </section>
    </div>
  )
}
