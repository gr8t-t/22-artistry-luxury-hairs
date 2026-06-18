import { Link } from 'react-router-dom'
import { ChevronRight, ArrowRight, Droplets, Layers, Eye, BookOpen, Gem, Sparkles, ShoppingBag, Star } from 'lucide-react'
import InstagramIcon from '../components/InstagramIcon'
import Reviews from '../components/Reviews'
import { useStore } from '../context/StoreContext'
import { useEffect, useRef } from 'react'

const SERVICES = [
  { Icon: Droplets,  title: 'Professional Colouring',   desc: 'Vibrant, expert colour treatments that last and complement your unique beauty.' },
  { Icon: Sparkles,  title: 'Frontal Installs',          desc: 'Seamless frontal installations with natural-looking hairlines — done to perfection.' },
  { Icon: Layers,    title: 'Machine Wigging',            desc: 'Precision machine-made wigs crafted for lasting comfort, durability, and style.' },
  { Icon: Gem,       title: 'Fixing of Nails',            desc: 'Refined nail designs and fixes for any occasion — elegant every time.' },
  { Icon: Eye,       title: 'Lashes Extension',           desc: 'Lash extensions that open and frame your eyes with stunning depth.' },
  { Icon: BookOpen,  title: 'General Training',           desc: 'Master the craft. Learn hair and beauty from our industry professionals.' },
]

const STATS = [
  { value: '500+', label: 'Happy Clients' },
  { value: '8',    label: 'Services Offered' },
  { value: '5.0',  label: 'Average Rating' },
  { value: '3+',   label: 'Years of Excellence' },
]

function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1'
          e.target.style.transform = 'translateY(0)'
        }
      })
    }, { threshold: 0.1 })
    ref.current.querySelectorAll('[data-reveal]').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

export default function Home() {
  const { products, addToCart } = useStore()
  const featured = products.filter(p => p.featured).slice(0, 3)
  const statsRef    = useRef(null)
  const servicesRef = useRef(null)
  const productsRef = useRef(null)
  useReveal(statsRef)
  useReveal(servicesRef)
  useReveal(productsRef)

  return (
    <div className="flex flex-col">

      {/* ════════════════════════════════════════
          HERO — editorial split
      ════════════════════════════════════════ */}
      <section className="relative min-h-screen flex overflow-hidden bg-brand-black">

        {/* Full-bleed background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/front pics.jpeg')` }}
        />

        {/* Gradient layers */}
        <div className="absolute inset-0"
          style={{
            background: 'linear-gradient(105deg, rgba(8,0,5,0.97) 0%, rgba(8,0,5,0.82) 45%, rgba(8,0,5,0.15) 100%)'
          }}
        />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40"
          style={{ background: 'linear-gradient(to top, #080005, transparent)' }}
        />
        {/* Pink ambient glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 600, height: 600,
            top: '10%', left: '-10%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(228,21,107,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-10 flex flex-col justify-center pt-32 pb-20 min-h-screen">
          <div className="max-w-[600px]">

            {/* Top tag */}
            <div
              className="flex items-center gap-3 mb-10 opacity-0 translate-y-8"
              style={{ animation: 'fadeUp .8s .1s cubic-bezier(.16,1,.3,1) forwards' }}
            >
              <div className="w-8 h-px bg-brand-pink" />
              <span className="eyebrow">Premium Hair Studio — Nigeria</span>
            </div>

            {/* Headline */}
            <h1
              className="display-xl opacity-0 translate-y-8"
              style={{ animation: 'fadeUp .9s .25s cubic-bezier(.16,1,.3,1) forwards' }}
            >
              Your<br />
              <em className="not-italic text-gradient">Beauty.</em><br />
              Our Artistry.
            </h1>

            {/* Rule */}
            <div
              className="my-7 h-px bg-gradient-to-r from-brand-pink/60 to-transparent w-0 opacity-0"
              style={{ animation: 'fadeUp .6s .6s ease forwards, lineGrow 1s .8s ease forwards' }}
            />

            {/* Tagline */}
            <p
              className="body-copy max-w-sm opacity-0 translate-y-6"
              style={{ animation: 'fadeUp .8s .5s cubic-bezier(.16,1,.3,1) forwards' }}
            >
              Experience luxury hair installations, professional colour treatments,
              and premium beauty services — crafted for the woman who demands excellence.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-wrap gap-3 mt-9 opacity-0 translate-y-6"
              style={{ animation: 'fadeUp .8s .65s cubic-bezier(.16,1,.3,1) forwards' }}
            >
              <Link to="/booking" className="btn-primary animate-pulse-pink">
                Book Appointment <ArrowRight size={15} />
              </Link>
              <Link to="/shop" className="btn-outline">
                Shop Hair
              </Link>
            </div>

            {/* Rating */}
            <div
              className="flex items-center gap-3 mt-10 opacity-0"
              style={{ animation: 'fadeIn .8s .85s ease forwards' }}
            >
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />)}
              </div>
              <span className="body-copy text-xs">Trusted by 500+ clients across Nigeria</span>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 right-10 hidden md:flex flex-col items-center gap-4 opacity-40">
          <span className="eyebrow" style={{ writingMode: 'vertical-rl', letterSpacing: '.2em' }}>SCROLL</span>
          <div className="w-px h-16 bg-gradient-to-b from-brand-pink to-transparent animate-float" />
        </div>
      </section>


      {/* ════════════════════════════════════════
          STATS
      ════════════════════════════════════════ */}
      <section ref={statsRef} className="border-y border-brand-border"
        style={{ background: 'linear-gradient(180deg, #0D000A 0%, #080005 100%)' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-brand-border">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                data-reveal
                className="text-center"
                style={{
                  opacity: 0,
                  transform: 'translateY(30px)',
                  transition: `opacity .7s ${i * .1}s ease, transform .7s ${i * .1}s ease`,
                }}
              >
                <p className="text-gradient" style={{ fontFamily: '"Cormorant Garant"', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700 }}>
                  {s.value}
                </p>
                <p className="body-copy text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          SERVICES
      ════════════════════════════════════════ */}
      <section ref={servicesRef} className="page-section">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <p className="eyebrow mb-3">What We Offer</p>
            <h2 className="display-md">
              Our <span className="text-gradient">Services</span>
            </h2>
          </div>
          <p className="body-copy max-w-xs text-right hidden md:block">
            A full suite of luxury beauty treatments — every detail handled with care.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((s, i) => (
            <div
              key={s.title}
              data-reveal
              className="group p-6 rounded-2xl border border-brand-border/60 card-hover cursor-default"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(228,21,107,0.02) 100%)',
                opacity: 0,
                transform: 'translateY(36px)',
                transition: `opacity .7s ${i * .08}s ease, transform .7s ${i * .08}s ease`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                style={{ background: 'rgba(228,21,107,0.08)', border: '1px solid rgba(228,21,107,0.15)' }}
              >
                <s.Icon size={18} className="text-brand-pink" />
              </div>
              <h3 className="text-white font-cormorant font-semibold text-lg mb-2 leading-snug"
                style={{ fontFamily: '"Cormorant Garant"' }}>
                {s.title}
              </h3>
              <p className="body-copy text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/booking" className="btn-outline">Reserve Your Appointment</Link>
        </div>
      </section>


      {/* ════════════════════════════════════════
          FEATURED PRODUCTS
      ════════════════════════════════════════ */}
      {featured.length > 0 && (
        <section
          ref={productsRef}
          className="py-20 md:py-28 border-y border-brand-border"
          style={{ background: 'linear-gradient(180deg, #0D000A 0%, #080005 100%)' }}
        >
          <div className="max-w-6xl mx-auto px-5 md:px-10">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="eyebrow mb-3">Shop</p>
                <h2 className="display-md">Featured <span className="text-gradient">Products</span></h2>
              </div>
              <Link to="/shop" className="btn-ghost group hidden md:flex">
                View all <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((p, i) => (
                <div
                  key={p.id}
                  data-reveal
                  className="rounded-2xl overflow-hidden card-hover border border-brand-border/50"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    opacity: 0,
                    transform: 'translateY(36px)',
                    transition: `opacity .7s ${i * .12}s ease, transform .7s ${i * .12}s ease`,
                  }}
                >
                  <div className="relative h-56 overflow-hidden bg-brand-card">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-108"
                      style={{ '--tw-scale-x': 1.08, '--tw-scale-y': 1.08 }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-brand-pink text-white text-xs font-sans font-medium px-2.5 py-1 rounded-full">
                        {p.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-white font-semibold text-base leading-snug"
                      style={{ fontFamily: '"Cormorant Garant"', fontSize: '1.15rem' }}>
                      {p.name}
                    </h3>
                    <p className="body-copy text-xs mt-1.5 line-clamp-2">{p.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-gradient font-semibold"
                        style={{ fontFamily: '"Cormorant Garant"', fontSize: '1.3rem' }}>
                        ₦{p.price.toLocaleString()}
                      </span>
                      <button onClick={() => addToCart(p)} className="btn-primary py-2 px-4 text-xs">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8 md:hidden">
              <Link to="/shop" className="btn-ghost">View all products <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>
      )}


      {/* ════════════════════════════════════════
          REVIEWS
      ════════════════════════════════════════ */}
      <Reviews />


      {/* ════════════════════════════════════════
          CTA BAND
      ════════════════════════════════════════ */}
      <section className="page-section">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-16 md:px-16 md:py-20 text-center"
          style={{
            background: 'linear-gradient(135deg, #9C0050 0%, #E4156B 50%, #c94080 100%)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, white, transparent)' }} />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, white, transparent)' }} />

          <div className="relative z-10">
            <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>Limited Slots Available</p>
            <h2 className="display-lg text-white mt-3 mb-4">
              Ready for Your<br />Transformation?
            </h2>
            <p className="body-copy max-w-sm mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Book your appointment today. Our artists are ready to craft your perfect look.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Link
                to="/booking"
                className="inline-flex items-center gap-2 bg-white font-sans font-semibold text-brand-pink px-8 py-3.5 rounded-full text-sm hover:bg-gray-100 transition-colors"
              >
                Book Appointment <ArrowRight size={15} />
              </Link>
              <a
                href="https://wa.me/2349075341220"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-white/50 text-white font-sans font-medium px-8 py-3.5 rounded-full text-sm hover:bg-white/10 transition-colors"
              >
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════
          INSTAGRAM
      ════════════════════════════════════════ */}
      <section className="pb-20 md:pb-28 px-5 md:px-10 max-w-6xl mx-auto w-full">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="eyebrow mb-2">Follow Our Work</p>
            <h2 className="display-md">@22artistry_<br className="sm:hidden" />luxuryhairs</h2>
          </div>
          <a
            href="https://www.instagram.com/22artistry_luxuryhairs"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost shrink-0"
          >
            <InstagramIcon size={15} /> Follow
          </a>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            'photo-1522337360788-8b13dee7a37e',
            'photo-1560472354-b33ff0c44a43',
            'photo-1595476108010-b4d1f102b1b1',
            'photo-1605497788044-5a32c7078486',
            'photo-1519735777090-ec97162dc266',
            'photo-1516975080664-ed2fc6a32937',
          ].map(id => (
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
                className="w-full h-full object-cover transition-transform duration-600"
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
              <div className="absolute inset-0 bg-brand-pink/0 group-hover:bg-brand-pink/20 transition-colors" />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
