import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { StoreProvider } from './context/StoreContext'
import { AuthProvider } from './context/AuthContext'
import Account from './pages/Account'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import AnnouncementModal from './components/AnnouncementModal'
import Home from './pages/Home'
import Gallery from './pages/Gallery'
import Shop from './pages/Shop'
import Booking from './pages/Booking'
import About from './pages/About'
import Admin from './pages/Admin'
import Announcements from './pages/Announcements'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function Layout({ children }) {
  const { pathname } = useLocation()
  const isAdmin = pathname === '/admin'

  return (
    <>
      <ScrollToTop />
      {!isAdmin && <Navbar />}
      {!isAdmin && <AnnouncementModal />}
      <CartDrawer />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      {!isAdmin && <Footer />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
    <StoreProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/account" element={<Account />} />
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/about" element={<About />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </StoreProvider>
    </AuthProvider>
  )
}
