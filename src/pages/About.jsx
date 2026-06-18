import { Link } from 'react-router-dom'
import { Heart, Award, Users, Sparkles } from 'lucide-react'

const VALUES = [
  { icon: Heart, title: 'Passion for Beauty', desc: 'Every client deserves to feel beautiful. We pour dedication into every service we deliver.' },
  { icon: Award, title: 'Excellence Always', desc: 'We hold ourselves to the highest standards — in product quality, technique, and client care.' },
  { icon: Users, title: 'Client First', desc: 'Your satisfaction is our purpose. We listen, adapt, and consistently exceed expectations.' },
  { icon: Sparkles, title: 'Luxury Redefined', desc: "Premium beauty experiences should be accessible. We bring world-class quality to every client." },
]

export default function About() {
  return (
    <div className="pt-24 min-h-screen">
      {/* Hero */}
      <div className="relative min-h-[60vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/ceo.jpeg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/88 to-brand-black/30" />
        <div className="relative z-10 page-section py-0">
          <div className="max-w-2xl">
            <p className="section-subtitle">Our Story</p>
            <h1 className="section-title text-4xl md:text-6xl leading-[1.12]">
              Built on <span className="text-gradient">Passion,</span><br />
              Driven by <span className="text-gradient">Excellence</span>
            </h1>
            <p className="text-gray-300 font-poppins mt-5 text-sm leading-relaxed max-w-md">
              22 Artistry Luxury Hairs was founded with one vision — to make every woman feel extraordinary. From our first client to our 500th, that standard has never changed.
            </p>
          </div>
        </div>
      </div>

      {/* Mission */}
      <section className="bg-brand-card border-y border-brand-border">
        <div className="page-section text-center">
          <p className="section-subtitle">Our Mission</p>
          <h2 className="section-title max-w-2xl mx-auto">
            "Your Beauty. Our Artistry.<br />
            <span className="text-gradient">Unmatched Luxury.</span>"
          </h2>
          <p className="text-gray-400 font-poppins mt-5 max-w-2xl mx-auto text-sm leading-relaxed">
            We believe that beauty is more than appearance — it is confidence, self-expression, and how you walk into a room.
            At 22 Artistry, we craft experiences that make you feel seen, valued, and absolutely stunning.
            Every service is performed with precision, every product curated for quality, and every client treated with the utmost care.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="page-section">
        <div className="text-center mb-12">
          <p className="section-subtitle">What We Stand For</p>
          <h2 className="section-title">Our <span className="text-gradient">Values</span></h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {VALUES.map(v => (
            <div key={v.title} className="glass-card p-6 rounded-2xl card-hover flex gap-5">
              <div className="w-11 h-11 rounded-xl bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center shrink-0 mt-1">
                <v.icon size={20} className="text-brand-pink" />
              </div>
              <div>
                <h3 className="font-playfair text-white font-semibold text-lg">{v.title}</h3>
                <p className="text-gray-500 font-poppins text-sm mt-2 leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Founder / CEO */}
      <section className="py-16 md:py-24 bg-brand-card border-y border-brand-border">
        <div className="page-section pt-0 pb-0">
          <div className="text-center mb-12">
            <p className="section-subtitle">The Visionary</p>
            <h2 className="section-title">Meet the <span className="text-gradient">Founder</span></h2>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16 max-w-3xl mx-auto">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-pink-gradient opacity-15 blur-2xl scale-110" />
              <img
                src="/ceo.jpeg"
                alt="Founder & CEO — 22 Artistry Luxury Hairs"
                className="relative w-52 h-52 md:w-64 md:h-64 rounded-full object-cover object-top border-2 border-brand-pink/40 shadow-2xl"
                onError={e => {
                  e.target.src = 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80'
                }}
              />
            </div>
            <div className="text-center md:text-left">
              <h3 className="font-playfair text-white font-bold text-2xl md:text-3xl">
                The Founder &amp; CEO
              </h3>
              <p className="text-brand-pink font-poppins font-medium text-sm mt-1 tracking-wide">
                Creative Director &bull; Lead Stylist
              </p>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mt-4 max-w-md">
                With years of dedicated experience in luxury hair styling, our founder built 22 Artistry Luxury Hairs on a simple belief — every woman deserves to feel like royalty.
                Her passion for transformative beauty has driven every service we offer and every client we serve.
              </p>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mt-3 max-w-md">
                From frontal installations to professional colouring, she has poured her artistry into building a brand that stands for quality, care, and unmatched luxury.
              </p>
              <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
                <Link to="/booking" className="btn-primary text-sm">
                  Book with Us
                </Link>
                <a
                  href="https://wa.me/2349075341220"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline text-sm"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="page-section text-center">
        <p className="section-subtitle">Begin Your Journey</p>
        <h2 className="section-title">
          Let Us Create Your<br /><span className="text-gradient">Perfect Look</span>
        </h2>
        <p className="text-gray-400 font-poppins mt-4 max-w-md mx-auto text-sm leading-relaxed">
          Whether it is a full transformation or a touch-up, we are ready to bring your vision to life.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Link to="/booking" className="btn-primary">Book Appointment</Link>
          <a href="https://wa.me/2349075341220" target="_blank" rel="noreferrer" className="btn-outline">
            Chat on WhatsApp
          </a>
        </div>
      </section>
    </div>
  )
}
