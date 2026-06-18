import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { cartCount, setCartOpen } = useStore()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMenuOpen(false), [location])

  const links = [
    { to: '/', label: 'Home' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/shop', label: 'Shop' },
    { to: '/booking', label: 'Book Now' },
    { to: '/about', label: 'About' },
  ]

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
          scrolled ? 'nav-blur py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-10 flex items-center justify-between">

          {/* Brand name */}
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
              style={{
                background: 'linear-gradient(135deg, #E4156B, #9C0050)',
                fontFamily: '"Cormorant Garant"',
                fontSize: '1.05rem',
              }}
            >
              22
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none"
                style={{ fontFamily: '"Cormorant Garant"', letterSpacing: '.04em' }}>
                22 Artistry
              </p>
              <p className="text-brand-pink font-sans text-[10px] tracking-widest uppercase leading-none mt-0.5">
                Luxury Hairs
              </p>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `link-line font-sans text-sm font-medium transition-colors duration-200 ${
                    isActive ? 'text-brand-pink' : 'text-gray-400 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 text-gray-400 hover:text-brand-pink transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-pink text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-medium"
                  style={{ width: 18, height: 18, fontSize: 10 }}>
                  {cartCount}
                </span>
              )}
            </button>
            <a
              href="https://wa.me/2349075341220"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex btn-primary py-2.5 px-5 text-xs"
            >
              WhatsApp Us
            </a>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
        menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-72 border-l border-brand-border flex flex-col pt-20 pb-10 px-7 transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
          style={{ background: '#0D000A' }}
        >
          <div className="space-y-1">
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `block py-4 border-b border-brand-border/40 font-sans font-medium text-base transition-colors ${
                    isActive ? 'text-brand-pink' : 'text-gray-300 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <a
            href="https://wa.me/2349075341220"
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-center mt-8 w-full"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </>
  )
}
