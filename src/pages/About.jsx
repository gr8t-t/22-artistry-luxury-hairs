import { Link } from 'react-router-dom'
import { Heart, Award, Users, Sparkles } from 'lucide-react'

const VALUES = [
  { icon: Heart, title: 'Passion for Beauty', desc: 'Every client deserves to feel beautiful. We pour our hearts into every service we provide.' },
  { icon: Award, title: 'Excellence Always', desc: 'We hold ourselves to the highest standards — in product quality, technique, and client care.' },
  { icon: Users, title: 'Client First', desc: 'Your satisfaction is our purpose. We listen, adapt, and deliver beyond expectations.' },
  { icon: Sparkles, title: 'Luxury Redefined', desc: "Luxury shouldn't be out of reach. We bring premium beauty experiences to every client." },
]

const TEAM = [
  {
    name: 'The Founder',
    role: 'Creative Director & Lead Stylist',
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80',
    bio: 'With years of experience in luxury hair styling, our founder built 22 Artistry on a simple belief: every woman deserves to feel like royalty.',
  },
  {
    name: 'Lead Colourist',
    role: 'Colour Specialist',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
    bio: 'A master of colour theory and transformation. Specialising in vibrant, bold hues and natural-looking highlights.',
  },
  {
    name: 'Beauty Expert',
    role: 'Nails & Lashes Specialist',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    bio: 'Passionate about the details that complete a look. Expert in nail artistry and lash extensions.',
  },
]

export default function About() {
  return (
    <div className="pt-24 min-h-screen">
      {/* Hero */}
      <div className="relative min-h-[60vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1400&q=80')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/85 to-brand-black/40" />
        <div className="relative z-10 page-section py-0">
          <div className="max-w-2xl">
            <p className="section-subtitle">Our Story</p>
            <h1 className="section-title text-4xl md:text-6xl leading-[1.15]">
              Born from a <span className="text-gradient">Passion</span><br />for Beauty
            </h1>
            <p className="text-gray-300 font-poppins mt-5 text-base leading-relaxed max-w-lg">
              22 Artistry Luxury Hairs was founded with one vision: to make every woman feel extraordinary.
              From our first client to our 500th, that vision has never changed.
            </p>
          </div>
        </div>
      </div>

      {/* Mission */}
      <section className="bg-brand-card border-y border-brand-border">
        <div className="page-section text-center">
          <p className="section-subtitle">Our Mission</p>
          <h2 className="section-title max-w-2xl mx-auto">
            "Your Beauty. Our Artistry.<br /><span className="text-gradient">Unmatched Luxury.</span>"
          </h2>
          <p className="text-gray-400 font-poppins mt-5 max-w-2xl mx-auto text-base leading-relaxed">
            We believe that beauty is more than looks — it's confidence, self-expression, and how you walk into a room.
            At 22 Artistry, we craft experiences that make you feel seen, valued, and absolutely stunning.
            Every service is performed with precision, every product curated for quality, and every client treated like royalty.
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
          {VALUES.map((v, i) => (
            <div key={v.title} className="glass-card p-6 rounded-2xl card-hover flex gap-5">
              <div className="w-12 h-12 rounded-xl bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center shrink-0 mt-1">
                <v.icon size={22} className="text-brand-pink" />
              </div>
              <div>
                <h3 className="font-playfair text-white font-semibold text-lg">{v.title}</h3>
                <p className="text-gray-400 font-poppins text-sm mt-2 leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-24 bg-brand-card border-y border-brand-border">
        <div className="page-section pt-0 pb-0">
          <div className="text-center mb-12">
            <p className="section-subtitle">The Team</p>
            <h2 className="section-title">Meet the <span className="text-gradient">Artists</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {TEAM.map(member => (
              <div key={member.name} className="text-center group">
                <div className="relative w-40 h-40 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full bg-pink-gradient opacity-20 group-hover:opacity-40 transition-opacity blur-md" />
                  <img
                    src={member.image}
                    alt={member.name}
                    className="relative w-full h-full rounded-full object-cover border-2 border-brand-pink/30 group-hover:border-brand-pink transition-colors"
                  />
                </div>
                <h3 className="font-playfair text-white font-semibold text-lg">{member.name}</h3>
                <p className="text-brand-pink text-sm font-poppins font-medium mt-0.5">{member.role}</p>
                <p className="text-gray-400 font-poppins text-sm mt-3 leading-relaxed max-w-xs mx-auto">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="page-section text-center">
        <p className="section-subtitle">Ready to Experience Us?</p>
        <h2 className="section-title">Let's Create Your<br /><span className="text-gradient">Perfect Look</span></h2>
        <p className="text-gray-400 font-poppins mt-4 max-w-lg mx-auto">
          Whether it's a full transformation or a touch-up, we're here to make it happen.
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
