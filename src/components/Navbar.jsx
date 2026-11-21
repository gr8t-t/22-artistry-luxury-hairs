import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  ShoppingBag, User, MessageCircle, House, Images, Store, Megaphone, CalendarCheck, Info,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import NotificationBell from './NotificationBell'

const LINKS = [
  { to: '/',              label: 'Home',     short: 'Home',    Icon: House },
  { to: '/gallery',       label: 'Gallery',  short: 'Gallery', Icon: Images },
  { to: '/shop',          label: 'Shop',     short: 'Shop',    Icon: Store },
  { to: '/announcements', label: 'Events',   short: 'Events',  Icon: Megaphone },
  { to: '/booking',       label: 'Book Now', short: 'Book',    Icon: CalendarCheck },
  { to: '/about',         label: 'About',    short: 'About',   Icon: Info },
]

function activeIndex(pathname) {
  return LINKS.findIndex(l => (l.to === '/' ? pathname === '/' : pathname.startsWith(l.to)))
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [ind, setInd] = useState({ left: 0, width: 0, ready: false })
  const groupRef = useRef(null)
  const { cartCount, setCartOpen } = useStore()
  const { pathname } = useLocation()
  const idx = activeIndex(pathname)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Slide the glowing highlight under the active desktop tab
  useLayoutEffect(() => {
    const place = () => {
      const el = groupRef.current?.querySelector('a[aria-current="page"]')
      if (!el) return setInd(i => ({ ...i, ready: false }))
      setInd({ left: el.offsetLeft, width: el.offsetWidth, ready: true })
    }
    place()
    window.addEventListener('resize', place)
    if (document.fonts?.ready) document.fonts.ready.then(place)
    return () => window.removeEventListener('resize', place)
  }, [pathname])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'nav-blur py-3' : 'bg-transparent max-md:bg-gradient-to-b max-md:from-[#080005]/90 max-md:via-[#080005]/55 max-md:to-transparent py-5'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-10 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0" aria-label="22 Artistry Luxury Hairs home">
            <img
              src="/logo-light.png"
              alt="22 Artistry Luxury Hairs"
              className="h-12 md:h-14 w-auto object-contain"
            />
          </Link>

          {/* Desktop glass tabs */}
          <div ref={groupRef} className="tab-group hidden md:flex" role="navigation" aria-label="Main">
            <span
              className="tab-indicator"
              style={{ left: ind.left, width: ind.width, opacity: ind.ready ? 1 : 0 }}
              aria-hidden="true"
            />
            {LINKS.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `relative z-10 px-3 lg:px-4 py-2 rounded-full font-sans text-sm font-medium transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="https://wa.me/2349075341220"
              target="_blank"
              rel="noreferrer"
              className="lg:hidden relative p-2 text-gray-200 hover:text-brand-pink transition-colors"
              aria-label="Chat on WhatsApp"
            >
              <MessageCircle size={20} />
            </a>
            <NotificationBell />
            <Link
              to="/account"
              className="relative p-2 text-gray-200 hover:text-brand-pink transition-colors"
              aria-label="My account"
            >
              <User size={20} />
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 text-gray-200 hover:text-brand-pink transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-brand-pink text-white rounded-full flex items-center justify-center font-medium"
                  style={{ width: 18, height: 18, fontSize: 10 }}
                >
                  {cartCount}
                </span>
              )}
            </button>
            <a
              href="https://wa.me/2349075341220"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-flex btn-primary py-2.5 px-5 text-xs ml-1"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </nav>

      {/* Mobile floating glass dock */}
      <nav className="dock md:hidden" aria-label="Main">
        <div className="relative grid grid-cols-6">
          <span
            className="dock-bubble"
            style={{ transform: `translateX(${Math.max(idx, 0) * 100}%)`, opacity: idx >= 0 ? 1 : 0 }}
            aria-hidden="true"
          >
            <span />
          </span>
          {LINKS.map(({ to, short, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="dock-tab relative flex flex-col items-center gap-1 pt-2 pb-1.5 text-gray-400"
            >
              <Icon size={21} className="dock-icon" strokeWidth={1.9} />
              <span className="dock-label text-[10px] font-medium leading-none">{short}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
