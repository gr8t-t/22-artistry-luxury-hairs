import { useState } from 'react'
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import CheckoutModal from './CheckoutModal'
import { useStore } from '../context/StoreContext'
import { Link } from 'react-router-dom'

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateCartQty, cartTotal, clearCart } = useStore()
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          cartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 z-50 bg-brand-card border-l border-brand-border flex flex-col transition-transform duration-300 ${
        cartOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-brand-pink" />
            <h3 className="font-playfair text-white font-bold text-lg">Your Cart</h3>
          </div>
          <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <ShoppingBag size={48} className="text-brand-border" />
              <div>
                <p className="text-white font-playfair text-lg">Your cart is empty</p>
                <p className="text-gray-500 text-sm font-poppins mt-1">Add items from the shop</p>
              </div>
              <Link to="/shop" onClick={() => setCartOpen(false)} className="btn-primary text-sm">
                Browse Shop
              </Link>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="glass-card p-3 rounded-xl flex gap-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-poppins font-semibold truncate">{item.name}</p>
                  <p className="text-brand-pink text-sm font-poppins">₦{item.price.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateCartQty(item.id, item.qty - 1)}
                      className="w-6 h-6 rounded-full border border-brand-border flex items-center justify-center text-gray-400 hover:border-brand-pink hover:text-brand-pink transition-all"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-white text-sm w-6 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateCartQty(item.id, item.qty + 1)}
                      className="w-6 h-6 rounded-full border border-brand-border flex items-center justify-center text-gray-400 hover:border-brand-pink hover:text-brand-pink transition-all"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="ml-auto text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-brand-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-poppins text-sm">Total</span>
              <span className="text-white font-playfair font-bold text-xl">₦{cartTotal.toLocaleString()}</span>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <ShoppingBag size={18} /> Checkout
            </button>
            <button
              onClick={clearCart}
              className="w-full text-gray-500 text-sm font-poppins hover:text-red-400 transition-colors text-center"
            >
              Clear cart
            </button>
          </div>
        )}
      </div>
      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} />}
    </>
  )
}
