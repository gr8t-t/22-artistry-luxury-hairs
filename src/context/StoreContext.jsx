import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

const StoreContext = createContext(null)

const IMPORT_DONE_KEY = 'artistry_import_done'

const CART_KEY = 'artistry_cart_v2'
const MAX_QTY = 10

/** The cart is saved on this device (only product ids and quantities) so a refresh never empties it. */
function readCartLines() {
  try {
    const a = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(a)
      ? a.filter(l => l && typeof l.id === 'string' && Number.isInteger(l.qty) && l.qty > 0).slice(0, 30).map(l => ({ id: l.id, qty: Math.min(l.qty, MAX_QTY) }))
      : []
  } catch { return [] }
}

function readLegacy(key) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : [] } catch { return [] }
}

export function StoreProvider({ children }) {
  const { user } = useAuth()
  const isStaff = !!user && (user.role === 'staff' || user.role === 'manager')
  const isManager = !!user && user.role === 'manager'

  const [products, setProducts] = useState([])
  const [gallery, setGallery] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [publicReviews, setPublicReviews] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [bookings, setBookings] = useState([])
  const [allReviews, setAllReviews] = useState(null) // manager only

  const [lines, setLines] = useState(readCartLines)
  const [cartOpen, setCartOpen] = useState(false)

  const loadCatalog = useCallback(async (fresh = false) => {
    try {
      // Staff always bypass the short edge cache so they never see an out-of-date list
      const d = await api(fresh ? `/catalog?fresh=${Date.now()}` : '/catalog')
      setProducts(d.products)
      setGallery(d.gallery)
      setAnnouncements(d.announcements)
      setPublicReviews(d.reviews)
    } catch (e) {
      console.error('Could not load catalogue', e)
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => { loadCatalog(isStaff) }, [loadCatalog, isStaff])

  // Staff-only data
  useEffect(() => {
    let cancelled = false
    if (!isStaff) { setBookings([]); setAllReviews(null); return }
    api('/admin/bookings').then(d => { if (!cancelled) setBookings(d.bookings) }).catch(() => {})
    if (isManager) api('/admin/reviews').then(d => { if (!cancelled) setAllReviews(d.reviews) }).catch(() => {})
    return () => { cancelled = true }
  }, [isStaff, isManager])

  // Runs an admin action; shows the server's message if it fails. Returns the result or null.
  const act = async (fn) => {
    try { return await fn() } catch (e) { window.alert(e.message); return null }
  }

  // Products
  const addProduct = (product) => act(async () => {
    const d = await api('/admin/products', { method: 'POST', body: product })
    setProducts(prev => [...prev, d.product])
    return d.product
  })
  const updateProduct = (id, updates) => act(async () => {
    const current = products.find(p => p.id === id) || {}
    const d = await api(`/admin/products/${id}`, { method: 'PATCH', body: { ...current, ...updates } })
    setProducts(prev => prev.map(p => p.id === id ? d.product : p))
    return d.product
  })
  const deleteProduct = (id) => act(async () => {
    await api(`/admin/products/${id}`, { method: 'DELETE' })
    setProducts(prev => prev.filter(p => p.id !== id))
    return true
  })

  // Gallery
  const addGalleryImage = (image) => act(async () => {
    const d = await api('/admin/gallery', { method: 'POST', body: image })
    setGallery(prev => [...prev, d.image])
    return d.image
  })
  const deleteGalleryImage = (id) => act(async () => {
    await api(`/admin/gallery/${id}`, { method: 'DELETE' })
    setGallery(prev => prev.filter(g => g.id !== id))
    return true
  })

  // Bookings (customers create; staff manage)
  const addBooking = async (booking) => {
    const d = await api('/bookings', { method: 'POST', body: booking })
    if (isStaff) setBookings(prev => [d.booking, ...prev])
    return d.booking
  }
  const updateBookingStatus = (id, status) => act(async () => {
    const d = await api(`/admin/bookings/${id}`, { method: 'PATCH', body: { status } })
    setBookings(prev => prev.map(b => b.id === id ? d.booking : b))
    return true
  })

  // Reviews
  const addReview = async (review) => {
    const d = await api('/reviews', { method: 'POST', body: review })
    if (isManager) setAllReviews(prev => [d.review, ...(prev || [])])
    return d.review
  }
  const approveReview = (id) => act(async () => {
    const d = await api(`/admin/reviews/${id}`, { method: 'PATCH' })
    setAllReviews(prev => (prev || []).map(r => r.id === id ? d.review : r))
    setPublicReviews(prev => [d.review, ...prev])
    return true
  })
  const deleteReview = (id) => act(async () => {
    await api(`/admin/reviews/${id}`, { method: 'DELETE' })
    setAllReviews(prev => (prev || []).filter(r => r.id !== id))
    setPublicReviews(prev => prev.filter(r => r.id !== id))
    return true
  })
  const reviews = isManager && allReviews ? allReviews : publicReviews

  // Announcements
  const addAnnouncement = (ann) => act(async () => {
    const d = await api('/admin/announcements', { method: 'POST', body: ann })
    setAnnouncements(prev => [d.announcement, ...prev])
    return d.announcement
  })
  const deleteAnnouncement = (id) => act(async () => {
    await api(`/admin/announcements/${id}`, { method: 'DELETE' })
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    return true
  })

  // One-time: bring over anything the owner added in this browser before the database existed
  const getLegacyData = () => {
    try { if (localStorage.getItem(IMPORT_DONE_KEY)) return { products: [], gallery: [], announcements: [] } } catch { /* ignore */ }
    const names = new Set(products.map(p => p.name.trim().toLowerCase()))
    const urls = new Set(gallery.map(g => g.url))
    const now = Date.now()
    return {
      products: readLegacy('artistry_products').filter(p => p?.name && !names.has(String(p.name).trim().toLowerCase())),
      gallery: readLegacy('artistry_gallery').filter(g => g?.url && /^https:\/\//i.test(g.url) && !urls.has(g.url)),
      announcements: readLegacy('artistry_announcements').filter(a => a?.expiresAt && new Date(a.expiresAt).getTime() > now),
    }
  }
  const importLegacyData = () => act(async () => {
    const data = getLegacyData()
    const d = await api('/admin/import', { method: 'POST', body: data })
    try { localStorage.setItem(IMPORT_DONE_KEY, '1') } catch { /* ignore */ }
    await loadCatalog(true)
    return d.imported
  })

  // Cart: saved on this device, and in the customer's account once they are logged in
  useEffect(() => {
    try {
      if (lines.length) localStorage.setItem(CART_KEY, JSON.stringify(lines))
      else localStorage.removeItem(CART_KEY)
    } catch { /* private mode: the cart still works until the tab closes */ }
  }, [lines])

  const cart = useMemo(
    () => lines.map(l => { const p = products.find(x => x.id === l.id); return p ? { ...p, qty: l.qty } : null }).filter(Boolean),
    [lines, products],
  )

  const cartOwner = user?.role === 'customer' ? user.id : null
  const syncedFor = useRef(null)
  useEffect(() => {
    let cancelled = false
    if (!cartOwner) {
      // logged out: do not leave the previous customer's cart on a shared device
      if (syncedFor.current) { syncedFor.current = null; setLines([]) }
      return
    }
    api('/me/cart').then(d => {
      if (cancelled) return
      setLines(prev => {
        const m = new Map(prev.map(l => [l.id, l.qty]))
        for (const i of d.items || []) m.set(i.productId, Math.max(m.get(i.productId) || 0, Math.min(i.qty, MAX_QTY)))
        return [...m].map(([id, qty]) => ({ id, qty }))
      })
      syncedFor.current = cartOwner
    }).catch(() => { syncedFor.current = cartOwner })
    return () => { cancelled = true }
  }, [cartOwner])

  useEffect(() => {
    if (!cartOwner || syncedFor.current !== cartOwner) return
    const t = setTimeout(() => {
      api('/me/cart', { method: 'PUT', body: { items: lines.map(l => ({ productId: l.id, qty: l.qty })) } }).catch(() => {})
    }, 700)
    return () => clearTimeout(t)
  }, [lines, cartOwner])

  const addToCart = (product) => {
    setLines(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: Math.min(MAX_QTY, i.qty + 1) } : i)
      return [...prev, { id: product.id, qty: 1 }]
    })
    setCartOpen(true)
  }
  const removeFromCart = (id) => setLines(prev => prev.filter(i => i.id !== id))
  const updateCartQty = (id, qty) => {
    if (qty < 1) return removeFromCart(id)
    setLines(prev => prev.map(i => i.id === id ? { ...i, qty: Math.min(MAX_QTY, qty) } : i))
  }
  const clearCart = () => setLines([])
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  const checkoutViaWhatsApp = () => {
    const lines = cart.map(i => `- ${i.name} x${i.qty} (N${(i.price * i.qty).toLocaleString()})`).join('\n')
    const msg = `Hello 22 Artistry! I would like to order:\n\n${lines}\n\nTotal: N${cartTotal.toLocaleString()}\n\nPlease confirm availability.`
    window.open(`https://wa.me/2349075341220?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <StoreContext.Provider value={{
      catalogLoading,
      products, addProduct, updateProduct, deleteProduct,
      gallery, addGalleryImage, deleteGalleryImage,
      bookings, addBooking, updateBookingStatus,
      reviews, addReview, approveReview, deleteReview,
      announcements, addAnnouncement, deleteAnnouncement,
      getLegacyData, importLegacyData,
      cart, cartOpen, setCartOpen, addToCart, removeFromCart,
      updateCartQty, clearCart, cartTotal, cartCount, checkoutViaWhatsApp,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
