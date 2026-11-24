import { useState, useEffect, useCallback } from 'react'
import { Package } from 'lucide-react'
import { api } from '../lib/api'
import { naira, dateTime } from '../lib/format'

const STATUS = { new: 'Waiting for confirmation', confirmed: 'Confirmed', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' }

export default function OrdersCard() {
  const [orders, setOrders] = useState(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    try { setOrders((await api('/me/orders')).orders) } catch { /* card stays hidden */ }
  }, [])
  useEffect(() => { load() }, [load])

  if (!orders || orders.length === 0) return null

  const cancel = async (o) => {
    if (!window.confirm(`Cancel order ${o.orderNo}?`)) return
    try { await api(`/me/orders/${o.id}/cancel`, { method: 'POST' }); setMsg('Order cancelled.'); load() } catch (e) { setMsg(e.message) }
  }
  const chat = (o) => {
    const text = `Hello 22 Artistry! About my order ${o.orderNo} (${naira(o.total)}).`
    return `https://wa.me/2349075341220?text=${encodeURIComponent(text)}`
  }

  return (
    <div className="glass-card rounded-2xl p-6 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Package size={16} className="text-brand-pink" />
        <p className="text-white font-semibold text-sm font-poppins">My orders</p>
      </div>
      <div className="space-y-3">
        {orders.map(o => (
          <div key={o.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold">{o.orderNo}</p>
                <p className="text-xs text-gray-300 font-poppins mt-0.5">{STATUS[o.status]} · {o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'} · {dateTime(o.createdAt)}</p>
              </div>
              <p className="text-white font-bold shrink-0">{naira(o.total)}</p>
            </div>
            <p className="text-sm text-gray-200 font-poppins mt-2">{o.items.map(i => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join(', ')}</p>
            {o.fulfilment === 'delivery' && (
              <p className="text-xs text-gray-300 font-poppins mt-1">
                {o.feePending ? 'Delivery fee: we will confirm it shortly.' : `Delivery fee ${naira(o.deliveryFee)} included.`}
              </p>
            )}
            {(o.status === 'confirmed' || o.status === 'ready') && (
              <p className="text-xs font-poppins mt-1 text-gray-200">
                {naira(o.paid)} paid{o.remaining > 0 ? ` · ${naira(o.remaining)} to pay at the salon or by transfer` : ' · paid in full'}
              </p>
            )}
            {o.status === 'cancelled' && o.cancelReason && <p className="text-xs text-gray-400 font-poppins mt-1">{o.cancelReason}</p>}
            <div className="flex gap-4 mt-3">
              {o.status === 'new' && <button onClick={() => cancel(o)} className="text-xs text-gray-300 hover:text-white font-poppins">Cancel order</button>}
              {o.status !== 'cancelled' && o.status !== 'completed' && (
                <a href={chat(o)} target="_blank" rel="noreferrer" className="text-xs text-brand-pink font-poppins">Chat with us about this order</a>
              )}
            </div>
          </div>
        ))}
      </div>
      {msg && <p className="text-sm font-poppins text-gray-100 mt-3" role="status">{msg}</p>}
    </div>
  )
}
