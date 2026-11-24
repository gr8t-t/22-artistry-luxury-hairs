import { useState, useEffect, useCallback } from 'react'
import { Package, Check, X, Truck, Store } from 'lucide-react'
import { api } from '../../lib/api'
import { naira, dateTime } from '../../lib/format'

const STATUS = { new: 'New', confirmed: 'Confirmed', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' }
const box = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }

export default function OrdersPanel() {
  const [orders, setOrders] = useState(null)
  const [msg, setMsg] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    try { setOrders((await api('/admin/orders')).orders) } catch (e) { setMsg(e.message) }
  }, [])
  useEffect(() => { load() }, [load])

  const run = async (o, path, body) => {
    setBusyId(o.id); setMsg('')
    try { await api(`/admin/orders/${o.id}/${path}`, { method: 'POST', body }); await load() } catch (e) { setMsg(e.message) } finally { setBusyId('') }
  }
  const confirmOrder = (o) => {
    let fee
    if (o.fulfilment === 'delivery') {
      const v = window.prompt(`Delivery fee for ${o.customer} (₦). Use 0 for free delivery:\n\n${o.address}`)
      if (v === null || v.trim() === '' || Number.isNaN(Number(v))) return
      fee = Number(v)
    } else if (!window.confirm(`Confirm ${o.orderNo} for ${o.customer}? The stock will be reduced.`)) return
    run(o, 'confirm', { deliveryFee: fee })
  }
  const cancelOrder = (o) => {
    const reason = window.prompt(`Cancel ${o.orderNo}? Type the reason the customer will see (required):`)
    if (!reason || reason.trim().length < 3) return
    run(o, 'cancel', { reason: reason.trim() })
  }

  const open = (orders || []).filter(o => ['new', 'confirmed', 'ready'].includes(o.status))
  const closed = (orders || []).filter(o => ['completed', 'cancelled'].includes(o.status))

  const card = (o) => (
    <li key={o.id} className="rounded-xl p-4" style={box}>
      <div className="flex justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold">{o.orderNo} <span className="text-gray-400 font-normal">· {STATUS[o.status]}</span></p>
          <p className="text-gray-200 text-sm font-poppins mt-0.5">{o.customer} <span className="text-gray-400">{o.customerPhone}</span></p>
          <p className="text-gray-200 text-sm font-poppins mt-1">{o.items.map(i => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join(', ')}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            {o.fulfilment === 'delivery' ? <Truck size={12} /> : <Store size={12} />}
            {o.fulfilment === 'delivery' ? `Delivery: ${o.address}${o.contactPhone ? ` · ${o.contactPhone}` : ''}` : 'Pickup at the salon'} · {dateTime(o.createdAt)}
          </p>
          {o.note && <p className="text-xs text-gray-300 mt-1">Note: {o.note}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-bold">{o.feePending ? naira(o.subtotal) : naira(o.total)}</p>
          {o.feePending && <p className="text-amber-300 text-xs">+ delivery fee to set</p>}
          {!o.feePending && o.deliveryFee != null && o.fulfilment === 'delivery' && <p className="text-gray-400 text-xs">incl. {naira(o.deliveryFee)} delivery</p>}
          {(o.status === 'confirmed' || o.status === 'ready') && <p className="text-xs text-gray-300 mt-1">{naira(o.paid)} paid · {naira(o.remaining)} left</p>}
        </div>
      </div>
      {o.status === 'cancelled' && o.cancelReason && <p className="text-xs text-gray-400 mt-2">{o.cancelReason}</p>}
      <div className="flex flex-wrap gap-2 mt-3">
        {o.status === 'new' && <button disabled={busyId === o.id} onClick={() => confirmOrder(o)} className="btn-primary text-xs py-2 px-4 disabled:opacity-60"><Check size={14} /> Confirm</button>}
        {o.status === 'confirmed' && <button disabled={busyId === o.id} onClick={() => run(o, 'ready')} className="btn-primary text-xs py-2 px-4 disabled:opacity-60"><Check size={14} /> {o.fulfilment === 'delivery' ? 'Out for delivery' : 'Mark ready'}</button>}
        {(o.status === 'confirmed' || o.status === 'ready') && <button disabled={busyId === o.id} onClick={() => run(o, 'complete')} className="btn-outline text-xs py-2 px-4 disabled:opacity-60"><Check size={14} /> Complete</button>}
        {['new', 'confirmed', 'ready'].includes(o.status) && <button disabled={busyId === o.id} onClick={() => cancelOrder(o)} className="btn-outline text-xs py-2 px-4 disabled:opacity-60"><X size={14} /> Cancel</button>}
      </div>
    </li>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="glass-card p-6">
        <h2 className="font-playfair text-white font-semibold text-xl flex items-center gap-2"><Package size={20} className="text-brand-pink" /> Orders</h2>
        <p className="text-gray-300 text-sm font-poppins mt-1">
          New orders from the app appear here and you are alerted. Confirm to take the stock off (and set the delivery fee). Record the customer&apos;s money in the <b className="text-white">Payments</b> tab and pick the order. Complete it once it is paid in full and handed over.
        </p>
        {msg && <p className="text-sm font-poppins text-red-300 mt-3" role="alert">{msg}</p>}
      </div>
      {orders === null ? <div className="spinner mx-auto my-4" aria-label="Loading" /> : (
        <>
          <div className="glass-card p-6">
            <h3 className="font-playfair text-white font-semibold text-lg mb-3">In progress</h3>
            {open.length === 0 ? <p className="text-gray-400 text-sm font-poppins">No orders waiting.</p> : <ul className="space-y-3">{open.map(card)}</ul>}
          </div>
          {closed.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-playfair text-white font-semibold text-lg mb-3">Recent history</h3>
              <ul className="space-y-3">{closed.slice(0, 12).map(card)}</ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
