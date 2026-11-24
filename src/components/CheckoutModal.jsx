import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X, ShoppingBag, Store, Truck, CalendarClock } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { AuthForms } from '../pages/Account'
import FlexPayModal from './FlexPayModal'
import { naira } from '../lib/format'

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))
const lab = 'block text-xs text-gray-300 font-poppins mb-1.5'

/** Checkout: the customer is asked to log in here (their cart is kept), then places the order in the app. */
export default function CheckoutModal({ onClose }) {
  const { user } = useAuth()
  const { cart, cartTotal, clearCart, checkoutViaWhatsApp } = useStore()
  const [fulfilment, setFulfilment] = useState('pickup')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [placed, setPlaced] = useState(null)
  const [flexOpen, setFlexOpen] = useState(false)
  const keyRef = useRef(newKey())

  const place = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const d = await api('/me/orders', {
        method: 'POST',
        body: {
          items: cart.map(i => ({ productId: i.id, qty: i.qty })), fulfilment,
          address: fulfilment === 'delivery' ? address.trim() : undefined,
          contactPhone: (phone || user.phone || '').trim() || undefined, note: note.trim() || undefined,
          idempotencyKey: keyRef.current,
        },
      })
      setPlaced(d.order || { orderNo: 'your order' })
      clearCart()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  if (flexOpen) return <FlexPayModal items={cart} total={cartTotal} onClose={() => setFlexOpen(false)} onDone={() => { clearCart() }} />

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Checkout">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto glass-card rounded-t-2xl sm:rounded-2xl p-6" style={{ background: 'rgba(24,4,18,0.97)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white" aria-label="Close"><X size={20} /></button>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag size={18} className="text-brand-pink" />
          <h3 className="font-playfair text-white font-bold text-lg">Checkout</h3>
        </div>

        {placed ? (
          <div className="space-y-4">
            <p className="text-white font-semibold font-poppins">Thank you. Order {placed.orderNo} is placed.</p>
            <p className="body-copy text-sm">Our team has been notified. We will confirm availability{fulfilment === 'delivery' ? ' and your delivery fee' : ''} and message you here in the app.</p>
            <Link to="/account" onClick={onClose} className="btn-primary w-full">View my orders</Link>
          </div>
        ) : !user ? (
          <div className="space-y-4">
            <p className="body-copy text-sm">Log in or create an account to place your order. Your cart is saved and will be here when you are done.</p>
            <AuthForms embedded />
          </div>
        ) : user.role !== 'customer' ? (
          <p className="body-copy text-sm">Staff accounts cannot place customer orders. Record sales in the Payments tab.</p>
        ) : cart.length === 0 ? (
          <p className="body-copy text-sm">Your cart is empty.</p>
        ) : (
          <form onSubmit={place} className="space-y-5">
            <ul className="text-sm font-poppins text-gray-200 space-y-1">
              {cart.map(i => <li key={i.id} className="flex justify-between gap-3"><span className="truncate">{i.name} x{i.qty}</span><span className="shrink-0">{naira(i.price * i.qty)}</span></li>)}
              <li className="flex justify-between gap-3 pt-2 border-t border-white/10 text-white font-semibold"><span>Items total</span><span>{naira(cartTotal)}</span></li>
            </ul>

            <div className="grid grid-cols-2 gap-2">
              {[['pickup', 'Pick up at the salon', Store], ['delivery', 'Delivery', Truck]].map(([id, t, Icon]) => (
                <button type="button" key={id} onClick={() => setFulfilment(id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-poppins transition-all ${
                    fulfilment === id ? 'border-brand-pink bg-brand-pink/20 text-white' : 'border-white/15 text-gray-300 hover:text-white hover:border-white/30'}`}>
                  <Icon size={18} /> {t}
                </button>
              ))}
            </div>

            {fulfilment === 'delivery' && (
              <div className="space-y-3">
                <div><label className={lab}>Delivery address *</label>
                  <textarea className="input-field" rows={2} value={address} onChange={e => setAddress(e.target.value)} maxLength={300} required /></div>
                <div><label className={lab}>Phone for the delivery</label>
                  <input className="input-field" value={phone} onChange={e => setPhone(e.target.value)} placeholder={user.phone || '08012345678'} inputMode="tel" /></div>
                <p className="body-copy text-xs">Our team will confirm the delivery fee for your area when they confirm the order. You are not charged until then.</p>
              </div>
            )}
            <div><label className={lab}>Note (optional)</label>
              <input className="input-field" value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="Anything we should know?" /></div>

            <p className="body-copy text-xs">You pay at the salon (cash or POS) or by bank transfer once we confirm the order.</p>
            {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">{busy ? 'Placing your order…' : 'Place order'}</button>
            <button type="button" onClick={() => setFlexOpen(true)} className="btn-outline w-full"><CalendarClock size={16} /> Pay in instalments (FlexPay)</button>
            <button type="button" onClick={() => { checkoutViaWhatsApp(); onClose() }} className="w-full text-center text-xs text-gray-400 hover:text-white font-poppins">
              Prefer WhatsApp? Send this cart to us there
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
