import { useState } from 'react'
import { ShoppingBag, Search, Filter } from 'lucide-react'
import { useStore } from '../context/StoreContext'

const CATEGORIES = ['All', 'Hair', 'Accessories', 'Beauty']

export default function Shop() {
  const { products, addToCart } = useStore()
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [added, setAdded] = useState(null)

  const filtered = products.filter(p => {
    const matchCat = category === 'All' || p.category === category
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleAdd = (product) => {
    addToCart(product)
    setAdded(product.id)
    setTimeout(() => setAdded(null), 1500)
  }

  return (
    <div className="pt-24 min-h-screen">
      {/* Header */}
      <div className="relative bg-brand-card border-b border-brand-border py-16 px-4 md:px-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-brand-pink/5 blur-3xl -translate-y-1/2" />
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <p className="section-subtitle">Our Collection</p>
          <h1 className="section-title text-4xl md:text-5xl">Luxury <span className="text-gradient">Hair & Beauty</span></h1>
          <p className="text-gray-400 font-poppins mt-3 max-w-lg mx-auto">
            Shop premium hair bundles, accessories, and beauty essentials. Order via WhatsApp — fast delivery available.
          </p>
        </div>
      </div>

      <div className="page-section">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2.5 rounded-full text-sm font-poppins font-medium transition-all ${
                  category === cat
                    ? 'bg-brand-pink text-white'
                    : 'glass-card text-gray-400 hover:text-white hover:border-brand-pink/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="text-brand-border mx-auto mb-4" />
            <p className="text-gray-400 font-poppins">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(p => (
              <div key={p.id} className="glass-card rounded-2xl overflow-hidden card-hover group">
                <div className="relative h-56 overflow-hidden bg-brand-card">
                  <img
                    src={p.image || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80'}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80' }}
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-brand-pink text-white text-xs font-poppins font-semibold px-2.5 py-1 rounded-full">
                      {p.category}
                    </span>
                    {p.quantity <= 3 && p.quantity > 0 && (
                      <span className="bg-yellow-500 text-black text-xs font-poppins font-bold px-2.5 py-1 rounded-full">
                        Only {p.quantity} left
                      </span>
                    )}
                    {p.quantity === 0 && (
                      <span className="bg-gray-700 text-gray-300 text-xs font-poppins font-semibold px-2.5 py-1 rounded-full">
                        Sold Out
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-playfair text-white font-semibold text-base leading-snug">{p.name}</h3>
                  <p className="text-gray-500 text-xs font-poppins mt-1.5 line-clamp-2">{p.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-brand-pink font-playfair text-lg font-bold">₦{p.price.toLocaleString()}</span>
                    <button
                      onClick={() => handleAdd(p)}
                      disabled={p.quantity === 0}
                      className={`flex items-center gap-1.5 text-sm font-poppins font-semibold px-4 py-2 rounded-full transition-all duration-300 ${
                        added === p.id
                          ? 'bg-green-500 text-white scale-95'
                          : p.quantity === 0
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-brand-pink text-white hover:bg-brand-dark hover:scale-105'
                      }`}
                    >
                      <ShoppingBag size={13} />
                      {added === p.id ? 'Added!' : p.quantity === 0 ? 'Sold Out' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* WhatsApp note */}
        <div className="mt-12 glass-card rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5 border-brand-pink/20">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-green-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="text-center sm:text-left">
            <h4 className="text-white font-playfair font-semibold">Need custom orders or bulk pricing?</h4>
            <p className="text-gray-400 text-sm font-poppins mt-1">Chat with us directly on WhatsApp for custom hair colours, lengths, and bulk discounts.</p>
          </div>
          <a
            href="https://wa.me/2349075341220"
            target="_blank"
            rel="noreferrer"
            className="btn-primary shrink-0 text-sm whitespace-nowrap"
          >
            Chat Now
          </a>
        </div>
      </div>
    </div>
  )
}
