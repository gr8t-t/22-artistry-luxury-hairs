import { useState, useRef } from 'react'
import { useStore } from '../context/StoreContext'
import {
  Lock, Package, Image, Calendar, Plus, Trash2, Edit3, Save, X,
  Eye, EyeOff, LogOut, CheckCircle, Clock, XCircle, Star, MessageSquare, Megaphone, Upload,
} from 'lucide-react'

const ADMIN_PASSWORD = 'artistry2024'
const TABS = ['Products', 'Gallery', 'Bookings', 'Reviews', 'Announcements']
const CATEGORIES = ['Hair', 'Accessories', 'Beauty']

const BLANK_PRODUCT = { name: '', category: 'Hair', price: '', quantity: '', description: '', image: '', featured: false }
const BLANK_IMAGE = { url: '', caption: '' }

/* Converts a File to a base64 data-URL so it can be stored in localStorage */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/* Reusable image-upload field: paste URL OR pick from device */
function ImageField({ label, value, onChange }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await readFileAsDataURL(file)
      onChange(dataUrl)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      {label && <label className="text-xs text-gray-400 font-poppins mb-1 block">{label}</label>}
      <div className="flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Paste image URL  —  or use Upload button →"
          value={value.startsWith('data:') ? '(uploaded from device)' : value}
          onChange={e => onChange(e.target.value)}
          readOnly={value.startsWith('data:')}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand-pink/40 text-brand-pink text-xs font-poppins font-medium hover:bg-brand-pink hover:text-white transition-all disabled:opacity-50"
        >
          {uploading ? <span className="spinner" /> : <Upload size={14} />}
          {uploading ? 'Loading…' : 'Upload'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 w-10 rounded-xl border border-brand-border text-gray-500 hover:text-red-400 hover:border-red-400/30 transition-all text-xs flex items-center justify-center"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {/* Hidden file input — accepts images, opens camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {value && (
        <img
          src={value}
          alt="preview"
          className="mt-3 rounded-xl max-h-40 object-cover border border-brand-border"
        />
      )}
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('artistry_admin') === '1')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [tab, setTab] = useState('Products')

  const {
    products, addProduct, updateProduct, deleteProduct,
    gallery, addGalleryImage, deleteGalleryImage,
    bookings, updateBookingStatus,
    reviews, approveReview, deleteReview,
    announcements, addAnnouncement, deleteAnnouncement,
  } = useStore()

  // Product state
  const [showProductForm, setShowProductForm] = useState(false)
  const [productForm, setProductForm] = useState(BLANK_PRODUCT)
  const [editProductId, setEditProductId] = useState(null)

  // Gallery state
  const [showImageForm, setShowImageForm] = useState(false)
  const [imageForm, setImageForm] = useState(BLANK_IMAGE)

  // Announcement state
  const [annForm, setAnnForm] = useState({ title: '', message: '', imageUrl: '', expiresAt: '' })
  const [annSaving, setAnnSaving] = useState(false)

  const login = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('artistry_admin', '1')
      setAuthed(true)
    } else {
      setLoginError('Incorrect password. Please try again.')
    }
  }

  const logout = () => {
    sessionStorage.removeItem('artistry_admin')
    setAuthed(false)
    setPassword('')
  }

  const saveProduct = () => {
    if (!productForm.name || !productForm.price) return
    const data = {
      ...productForm,
      price: Number(productForm.price),
      quantity: Number(productForm.quantity) || 0,
    }
    if (editProductId) {
      updateProduct(editProductId, data)
      setEditProductId(null)
    } else {
      addProduct(data)
    }
    setProductForm(BLANK_PRODUCT)
    setShowProductForm(false)
  }

  const editProduct = (p) => {
    setProductForm({ ...p, price: String(p.price), quantity: String(p.quantity) })
    setEditProductId(p.id)
    setShowProductForm(true)
  }

  const saveImage = () => {
    if (!imageForm.url) return
    addGalleryImage(imageForm)
    setImageForm(BLANK_IMAGE)
    setShowImageForm(false)
  }

  const statusIcon = (s) => {
    if (s === 'confirmed') return <CheckCircle size={14} className="text-green-400" />
    if (s === 'cancelled') return <XCircle size={14} className="text-red-400" />
    return <Clock size={14} className="text-yellow-400" />
  }

  // ── Login screen ──
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-pink-gradient flex items-center justify-center text-white font-playfair font-bold text-2xl mx-auto mb-4">
              22
            </div>
            <h1 className="font-playfair text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-500 font-poppins text-sm mt-1">22 Artistry Luxury Hairs</p>
          </div>
          <form onSubmit={login} className="glass-card rounded-2xl p-8 space-y-5">
            <div>
              <label className="block text-sm font-poppins text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setLoginError('') }}
                  placeholder="Enter admin password"
                  className="input-field pl-10 pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {loginError && <p className="text-red-400 text-xs font-poppins mt-2">{loginError}</p>}
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              <Lock size={15} /> Sign In
            </button>
            <p className="text-center text-gray-600 text-xs font-poppins">
              Default password: <span className="text-gray-400 font-mono">artistry2024</span>
            </p>
          </form>
        </div>
      </div>
    )
  }

  // ── Admin dashboard ──
  return (
    <div className="pt-20 min-h-screen">
      {/* Top bar */}
      <div className="bg-brand-card border-b border-brand-border px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-pink-gradient flex items-center justify-center text-white font-playfair font-bold text-sm">22</div>
          <div>
            <p className="text-white font-poppins font-semibold text-sm">Admin Dashboard</p>
            <p className="text-gray-500 text-xs font-poppins">22 Artistry Luxury Hairs</p>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm font-poppins">
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Package, label: 'Products', value: products.length, color: 'text-brand-pink' },
            { icon: Image, label: 'Gallery Photos', value: gallery.length, color: 'text-blue-400' },
            { icon: Calendar, label: 'Bookings', value: bookings.length, color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
              <s.icon size={22} className={s.color} />
              <div>
                <p className="text-white font-playfair font-bold text-xl">{s.value}</p>
                <p className="text-gray-500 text-xs font-poppins">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-brand-border pb-4">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-poppins font-medium transition-all ${
                tab === t ? 'bg-brand-pink text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── PRODUCTS TAB ── */}
        {tab === 'Products' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-playfair text-white font-semibold text-xl">Products</h2>
              <button
                onClick={() => { setShowProductForm(true); setEditProductId(null); setProductForm(BLANK_PRODUCT) }}
                className="btn-primary text-sm py-2 flex items-center gap-1.5"
              >
                <Plus size={15} /> Add Product
              </button>
            </div>

            {/* Product form */}
            {showProductForm && (
              <div className="glass-card rounded-2xl p-6 mb-6 border border-brand-pink/20">
                <h3 className="font-playfair text-white font-semibold mb-4">
                  {editProductId ? 'Edit Product' : 'New Product'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-poppins mb-1 block">Product Name *</label>
                    <input className="input-field" placeholder="e.g. Brazilian Bundle" value={productForm.name}
                      onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-poppins mb-1 block">Category</label>
                    <select className="input-field appearance-none" value={productForm.category}
                      onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-poppins mb-1 block">Price (₦) *</label>
                    <input type="number" className="input-field" placeholder="e.g. 25000" value={productForm.price}
                      onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-poppins mb-1 block">Quantity in Stock</label>
                    <input type="number" className="input-field" placeholder="e.g. 10" value={productForm.quantity}
                      onChange={e => setProductForm(p => ({ ...p, quantity: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <ImageField
                      label="Product Image"
                      value={productForm.image}
                      onChange={v => setProductForm(p => ({ ...p, image: v }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-400 font-poppins mb-1 block">Description</label>
                    <textarea rows={3} className="input-field resize-none" placeholder="Product description…" value={productForm.description}
                      onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="featured" checked={productForm.featured}
                      onChange={e => setProductForm(p => ({ ...p, featured: e.target.checked }))}
                      className="w-4 h-4 accent-brand-pink" />
                    <label htmlFor="featured" className="text-sm text-gray-400 font-poppins">Featured on homepage</label>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={saveProduct} className="btn-primary text-sm py-2 flex items-center gap-1.5">
                    <Save size={14} /> Save
                  </button>
                  <button onClick={() => { setShowProductForm(false); setEditProductId(null) }}
                    className="btn-outline text-sm py-2 flex items-center gap-1.5">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Products list */}
            <div className="space-y-3">
              {products.length === 0 && (
                <p className="text-gray-500 font-poppins text-sm text-center py-10">No products yet. Add your first product.</p>
              )}
              {products.map(p => (
                <div key={p.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                  <img
                    src={p.image || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100&q=60'}
                    alt={p.name}
                    className="w-14 h-14 object-cover rounded-lg shrink-0"
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100&q=60' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-poppins font-semibold text-sm">{p.name}</p>
                      <span className="text-xs bg-brand-pink/20 text-brand-pink px-2 py-0.5 rounded-full font-poppins">{p.category}</span>
                      {p.featured && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-poppins">Featured</span>}
                    </div>
                    <p className="text-brand-pink font-poppins text-sm">₦{p.price.toLocaleString()}</p>
                    <p className="text-gray-500 text-xs font-poppins">Qty: {p.quantity}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editProduct(p)}
                      className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-gray-400 hover:text-brand-pink hover:border-brand-pink/40 transition-all">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => deleteProduct(p.id)}
                      className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-gray-400 hover:text-red-400 hover:border-red-400/40 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GALLERY TAB ── */}
        {tab === 'Gallery' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-playfair text-white font-semibold text-xl">Gallery</h2>
              <button
                onClick={() => { setShowImageForm(true); setImageForm(BLANK_IMAGE) }}
                className="btn-primary text-sm py-2 flex items-center gap-1.5"
              >
                <Plus size={15} /> Add Photo
              </button>
            </div>

            {showImageForm && (
              <div className="glass-card rounded-2xl p-6 mb-6 border border-brand-pink/20">
                <h3 className="font-playfair text-white font-semibold mb-4">Add Gallery Photo</h3>
                <div className="space-y-4">
                  <div>
                    <ImageField
                      label="Gallery Photo *"
                      value={imageForm.url}
                      onChange={v => setImageForm(f => ({ ...f, url: v }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-poppins mb-1 block">Caption</label>
                    <input className="input-field" placeholder="e.g. Frontal Install" value={imageForm.caption}
                      onChange={e => setImageForm(f => ({ ...f, caption: e.target.value }))} />
                  </div>
                  {imageForm.url && (
                    <img src={imageForm.url} alt="Preview" className="w-32 h-32 object-cover rounded-xl"
                      onError={e => { e.target.style.display = 'none' }} />
                  )}
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={saveImage} className="btn-primary text-sm py-2 flex items-center gap-1.5">
                    <Save size={14} /> Save
                  </button>
                  <button onClick={() => setShowImageForm(false)} className="btn-outline text-sm py-2 flex items-center gap-1.5">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gallery.map(img => (
                <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.caption}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=60' }}
                  />
                  <div className="absolute inset-0 bg-brand-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    {img.caption && <p className="text-white text-xs font-poppins px-2 text-center">{img.caption}</p>}
                    <button onClick={() => deleteGalleryImage(img.id)}
                      className="w-9 h-9 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {gallery.length === 0 && (
                <p className="text-gray-500 font-poppins text-sm col-span-4 text-center py-10">No gallery photos yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ── BOOKINGS TAB ── */}
        {tab === 'Bookings' && (
          <div>
            <h2 className="font-playfair text-white font-semibold text-xl mb-5">Bookings</h2>
            {bookings.length === 0 ? (
              <div className="text-center py-14">
                <Calendar size={40} className="text-brand-border mx-auto mb-3" />
                <p className="text-gray-500 font-poppins">No bookings yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...bookings].reverse().map(b => (
                  <div key={b.id} className="glass-card rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {statusIcon(b.status)}
                          <span className={`text-xs font-poppins font-semibold capitalize ${
                            b.status === 'confirmed' ? 'text-green-400' :
                            b.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'
                          }`}>{b.status}</span>
                        </div>
                        <p className="text-white font-poppins font-semibold">{b.name}</p>
                        <p className="text-gray-400 text-sm font-poppins">{b.phone}</p>
                        <p className="text-brand-pink text-sm font-poppins mt-1">{b.service}</p>
                        <p className="text-gray-500 text-xs font-poppins mt-1">{b.date} at {b.time}</p>
                        {b.notes && <p className="text-gray-500 text-xs font-poppins mt-1 italic">"{b.notes}"</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateBookingStatus(b.id, 'confirmed')}
                          className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-poppins hover:bg-green-500/20 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => updateBookingStatus(b.id, 'cancelled')}
                          className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-poppins hover:bg-red-500/20 transition-colors"
                        >
                          Cancel
                        </button>
                        <a
                          href={`https://wa.me/${b.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${b.name}, your appointment for ${b.service} on ${b.date} at ${b.time} has been confirmed! See you soon. — 22 Artistry Luxury Hairs`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-full bg-brand-pink/10 border border-brand-pink/30 text-brand-pink text-xs font-poppins hover:bg-brand-pink/20 transition-colors"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {tab === 'Reviews' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-playfair text-white font-semibold text-xl">
                Reviews
                <span className="ml-2 text-sm text-gray-500 font-poppins font-normal">
                  ({reviews.filter(r => !r.approved).length} pending)
                </span>
              </h2>
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-14">
                <MessageSquare size={40} className="text-brand-border mx-auto mb-3" />
                <p className="text-gray-500 font-poppins">No reviews submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...reviews].reverse().map(r => (
                  <div key={r.id} className={`glass-card rounded-xl p-5 border ${r.approved ? 'border-green-500/20' : 'border-brand-pink/10'}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs font-poppins font-semibold px-2 py-0.5 rounded-full ${
                            r.approved
                              ? 'bg-green-500/15 text-green-400'
                              : 'bg-yellow-500/15 text-yellow-400'
                          }`}>
                            {r.approved ? 'Published' : 'Pending Approval'}
                          </span>
                        </div>
                        <p className="text-white font-poppins font-semibold text-sm">{r.name}</p>
                        {r.service && <p className="text-brand-pink text-xs font-poppins mt-0.5">{r.service}</p>}
                        <div className="flex gap-0.5 mt-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                          ))}
                        </div>
                        <p className="text-gray-400 text-sm font-poppins mt-2 leading-relaxed">"{r.comment}"</p>
                        <p className="text-gray-600 text-xs font-poppins mt-2">
                          {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!r.approved && (
                          <button
                            onClick={() => approveReview(r.id)}
                            className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-poppins hover:bg-green-500/20 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => deleteReview(r.id)}
                          className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-gray-500 hover:text-red-400 hover:border-red-400/30 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ANNOUNCEMENTS TAB ── */}
        {tab === 'Announcements' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Megaphone size={20} className="text-brand-pink" />
              <h2 className="font-playfair text-white font-semibold text-xl">Promotional Announcements</h2>
            </div>
            <p className="text-gray-500 font-poppins text-sm mb-7">
              Post a flyer or promo banner that visitors see as a popup when they open the site. Set an expiry — it disappears automatically when time is up.
            </p>

            {/* Add form */}
            <div className="glass-card rounded-2xl p-6 mb-8 border border-brand-pink/10">
              <h3 className="font-playfair text-white font-semibold mb-5">Post New Announcement</h3>
              <div className="space-y-4">
                <div>
                  <ImageField
                    label="Flyer / Poster Image"
                    value={annForm.imageUrl}
                    onChange={v => setAnnForm(f => ({ ...f, imageUrl: v }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-poppins mb-1 block">Headline (optional)</label>
                  <input
                    className="input-field"
                    placeholder="e.g. 50% OFF This Weekend!"
                    value={annForm.title}
                    onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-poppins mb-1 block">Message (optional)</label>
                  <textarea
                    className="input-field resize-none"
                    rows={2}
                    placeholder="Short description of the promo..."
                    value={annForm.message}
                    onChange={e => setAnnForm(f => ({ ...f, message: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-poppins mb-1 block">Expiry Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={annForm.expiresAt}
                    onChange={e => setAnnForm(f => ({ ...f, expiresAt: e.target.value }))}
                  />
                  <p className="text-gray-600 text-xs font-poppins mt-1">The popup will stop showing automatically after this time.</p>
                </div>
                <button
                  onClick={() => {
                    if (!annForm.expiresAt) return
                    if (!annForm.imageUrl && !annForm.title && !annForm.message) return
                    addAnnouncement({ ...annForm, expiresAt: new Date(annForm.expiresAt).toISOString() })
                    setAnnForm({ title: '', message: '', imageUrl: '', expiresAt: '' })
                  }}
                  className="btn-primary"
                >
                  <Plus size={15} /> Post Announcement
                </button>
              </div>
            </div>

            {/* Existing announcements */}
            <h3 className="font-playfair text-white font-semibold text-lg mb-4">Active &amp; Past Announcements</h3>
            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <Megaphone size={36} className="text-brand-border mx-auto mb-3" />
                <p className="text-gray-500 font-poppins text-sm">No announcements yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...announcements].reverse().map(a => {
                  const expired = new Date(a.expiresAt) < new Date()
                  return (
                    <div key={a.id} className={`glass-card rounded-xl p-5 border ${expired ? 'border-gray-700/30 opacity-60' : 'border-brand-pink/20'}`}>
                      <div className="flex gap-4 items-start">
                        {a.imageUrl && (
                          <img src={a.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover border border-brand-border shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-poppins font-semibold px-2 py-0.5 rounded-full ${
                              expired ? 'bg-gray-700/40 text-gray-400' : 'bg-green-500/15 text-green-400'
                            }`}>
                              {expired ? 'Expired' : 'Live'}
                            </span>
                          </div>
                          {a.title && <p className="text-white font-poppins font-semibold text-sm">{a.title}</p>}
                          {a.message && <p className="text-gray-400 text-xs font-poppins mt-1">{a.message}</p>}
                          <p className="text-gray-600 text-xs font-poppins mt-2">
                            Expires: {new Date(a.expiresAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteAnnouncement(a.id)}
                          className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-gray-500 hover:text-red-400 hover:border-red-400/30 transition-all shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
