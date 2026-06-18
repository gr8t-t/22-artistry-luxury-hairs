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
    const onScroll = () => setScrolled(window.scrollY > 20)
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
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'nav-blur bg-brand-black/90 shadow-lg shadow-black/40 py-2' : 'bg-transparent py-4'
      }`}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img
              src="/logo.jpeg"
              alt="22 Artistry Luxury Hairs"
              className="h-12 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              onError={e => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            {/* Fallback if logo.png not yet added */}
            <div style={{ display: 'none' }} className="items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-pink-gradient flex items-center justify-center text-white font-playfair font-bold text-lg shadow-lg">
                22
              </div>
              <div className="hidden sm:block">
                <p className="font-playfair font-bold text-white text-sm leading-tight">22 Artistry</p>
                <p className="text-brand-pink text-xs font-poppins tracking-widest">LUXURY HAIRS</p>
              </div>
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
                  `animated-underline font-poppins text-sm font-medium transition-colors ${
                    isActive ? 'text-brand-pink' : 'text-gray-300 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 text-gray-300 hover:text-brand-pink transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-pink text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold animate-fade-in">
                  {cartCount}
                </span>
              )}
            </button>
            <a
              href="https://wa.me/2349075341220"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:block btn-primary text-sm py-2 px-5"
            >
              WhatsApp Us
            </a>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="md:hidden p-2 text-gray-300 hover:text-white"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`fixed inset-0 z-40 transition-all duration-300 md:hidden ${
        menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-72 bg-brand-card border-l border-brand-border flex flex-col pt-24 pb-8 px-6 transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `py-4 border-b border-brand-border font-poppins font-medium text-base transition-colors ${
                  isActive ? 'text-brand-pink' : 'text-gray-200 hover:text-brand-pink'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <a
            href="https://wa.me/2349075341220"
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-center mt-6"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </>
  )
}
