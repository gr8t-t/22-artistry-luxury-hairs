import { createContext, useContext, useState, useEffect } from 'react'

const StoreContext = createContext(null)

const DEFAULT_PRODUCTS = [
  {
    id: '1',
    name: 'Brazilian Body Wave Bundle',
    category: 'Hair',
    price: 25000,
    quantity: 10,
    description: '100% virgin Brazilian hair. Soft, silky body wave texture. Available in 10" – 30".',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
    featured: true,
  },
  {
    id: '2',
    name: 'Frontal Lace 13x4',
    category: 'Hair',
    price: 18000,
    quantity: 8,
    description: 'Pre-plucked hairline. Invisible knots. Swiss lace. Perfect for a natural look.',
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80',
    featured: true,
  },
  {
    id: '3',
    name: 'Luxury Press-On Nails Set',
    category: 'Accessories',
    price: 5500,
    quantity: 20,
    description: 'Salon-quality press-on nails. Long-lasting adhesive. Various designs available.',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
    featured: false,
  },
  {
    id: '4',
    name: 'Mink Lash Extension Set',
    category: 'Beauty',
    price: 4500,
    quantity: 15,
    description: 'Ultra-natural mink lashes. Full volume, lightweight. Reusable up to 25 times.',
    image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&q=80',
    featured: true,
  },
]

const DEFAULT_GALLERY = [
  { id: '1', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80', caption: 'Frontal Install' },
  { id: '2', url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80', caption: 'Colour Treatment' },
  { id: '3', url: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600&q=80', caption: 'Machine Wigging' },
  { id: '4', url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80', caption: 'Revamp' },
  { id: '5', url: 'https://images.unsplash.com/photo-1519735777090-ec97162dc266?w=600&q=80', caption: 'Lash Extension' },
  { id: '6', url: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&q=80', caption: 'Nail Fix' },
]

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(() => {
    try { const s = localStorage.getItem('artistry_products'); return s ? JSON.parse(s) : DEFAULT_PRODUCTS }
    catch { return DEFAULT_PRODUCTS }
  })

  const [gallery, setGallery] = useState(() => {
    try { const s = localStorage.getItem('artistry_gallery'); return s ? JSON.parse(s) : DEFAULT_GALLERY }
    catch { return DEFAULT_GALLERY }
  })

  const [bookings, setBookings] = useState(() => {
    try { const s = localStorage.getItem('artistry_bookings'); return s ? JSON.parse(s) : [] }
    catch { return [] }
  })

  const [reviews, setReviews] = useState(() => {
    try { const s = localStorage.getItem('artistry_reviews'); return s ? JSON.parse(s) : [] }
    catch { return [] }
  })

  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => { localStorage.setItem('artistry_products', JSON.stringify(products)) }, [products])
  useEffect(() => { localStorage.setItem('artistry_gallery', JSON.stringify(gallery)) }, [gallery])
  useEffect(() => { localStorage.setItem('artistry_bookings', JSON.stringify(bookings)) }, [bookings])
  useEffect(() => { localStorage.setItem('artistry_reviews', JSON.stringify(reviews)) }, [reviews])

  // Products CRUD
  const addProduct = (product) => setProducts(prev => [...prev, { ...product, id: Date.now().toString() }])
  const updateProduct = (id, updates) => setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  const deleteProduct = (id) => setProducts(prev => prev.filter(p => p.id !== id))

  // Gallery CRUD
  const addGalleryImage = (image) => setGallery(prev => [...prev, { ...image, id: Date.now().toString() }])
  const deleteGalleryImage = (id) => setGallery(prev => prev.filter(img => img.id !== id))

  // Bookings
  const addBooking = (booking) => {
    const newBooking = { ...booking, id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'pending' }
    setBookings(prev => [...prev, newBooking])
    return newBooking
  }
  const updateBookingStatus = (id, status) => setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))

  // Reviews
  const addReview = (review) => {
    const newReview = {
      ...review,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      approved: false,
    }
    setReviews(prev => [...prev, newReview])
    return newReview
  }
  const approveReview = (id) => setReviews(prev => prev.map(r => r.id === id ? { ...r, approved: true } : r))
  const deleteReview = (id) => setReviews(prev => prev.filter(r => r.id !== id))

  // Cart
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
    setCartOpen(true)
  }
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))
  const updateCartQty = (id, qty) => {
    if (qty < 1) return removeFromCart(id)
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }
  const clearCart = () => setCart([])
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  const checkoutViaWhatsApp = () => {
    const lines = cart.map(i => `- ${i.name} x${i.qty} (N${(i.price * i.qty).toLocaleString()})`).join('\n')
    const msg = `Hello 22 Artistry! I would like to order:\n\n${lines}\n\nTotal: N${cartTotal.toLocaleString()}\n\nPlease confirm availability.`
    window.open(`https://wa.me/2349075341220?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <StoreContext.Provider value={{
      products, addProduct, updateProduct, deleteProduct,
      gallery, addGalleryImage, deleteGalleryImage,
      bookings, addBooking, updateBookingStatus,
      reviews, addReview, approveReview, deleteReview,
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
