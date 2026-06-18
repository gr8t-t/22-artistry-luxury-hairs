import { Link } from 'react-router-dom'
import { MessageCircle, MapPin, Phone } from 'lucide-react'
import InstagramIcon from './InstagramIcon'

export default function Footer() {
  const services = [
    'Professional Colouring', 'Sales of Luxury Hair', 'Revamping Specialist',
    'Professional Machine Wigging', 'Frontal Installs', 'Fixing of Nails',
    'Lashes Extension', 'General Training Program',
  ]

  return (
    <footer className="bg-brand-card border-t border-brand-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-pink-gradient flex items-center justify-center text-white font-playfair font-bold text-xl">
                22
              </div>
              <div>
                <p className="font-playfair font-bold text-white">22 Artistry</p>
                <p className="text-brand-pink text-xs tracking-widest font-poppins">LUXURY HAIRS</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm font-poppins leading-relaxed">
              Your Beauty. Our Artistry.<br />Unmatched Luxury.
            </p>
            <div className="flex gap-3 mt-5">
              <a
                href="https://www.instagram.com/22artistry_luxuryhairs"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-gray-400 hover:text-brand-pink hover:border-brand-pink/50 transition-all"
              >
                <InstagramIcon size={18} />
              </a>
              <a
                href="https://wa.me/2349075341220"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-gray-400 hover:text-brand-pink hover:border-brand-pink/50 transition-all"
              >
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-playfair font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/gallery', label: 'Gallery' },
                { to: '/shop', label: 'Shop' },
                { to: '/booking', label: 'Book Appointment' },
                { to: '/about', label: 'About Us' },
              ].map(link => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-gray-400 text-sm font-poppins hover:text-brand-pink transition-colors animated-underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-playfair font-semibold mb-4">Our Services</h4>
            <ul className="space-y-2">
              {services.map(s => (
                <li key={s} className="text-gray-400 text-sm font-poppins flex items-start gap-2">
                  <span className="text-brand-pink mt-1">›</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-playfair font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="https://wa.me/2349075341220"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-gray-400 hover:text-brand-pink transition-colors"
                >
                  <MessageCircle size={16} className="text-brand-pink shrink-0" />
                  <span className="text-sm font-poppins">+234 907 534 1220</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/22artistry_luxuryhairs"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-gray-400 hover:text-brand-pink transition-colors"
                >
                  <InstagramIcon size={16} className="text-brand-pink shrink-0" />
                  <span className="text-sm font-poppins">@22artistry_luxuryhairs</span>
                </a>
              </li>
            </ul>

            <div className="mt-6 p-4 glass-card rounded-xl">
              <p className="text-xs text-brand-pink font-poppins font-semibold tracking-wide uppercase mb-1">Opening Hours</p>
              <p className="text-sm text-gray-300 font-poppins">Mon – Sat: 9am – 7pm</p>
              <p className="text-sm text-gray-300 font-poppins">Sunday: By appointment</p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-xs font-poppins">
            © {new Date().getFullYear()} 22 Artistry Luxury Hairs. All rights reserved.
          </p>
          <Link to="/admin" className="text-gray-600 text-xs font-poppins hover:text-gray-400 transition-colors">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}
