import { X, Printer, MessageCircle } from 'lucide-react'
import { naira, dateTime, METHOD_LABEL } from '../lib/format'

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-white/10 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white text-right font-medium">{children}</span>
    </div>
  )
}

/**
 * The receipt for a closed deal: an online order, or a FlexPay plan that has been paid off.
 * Customers see it in their account. Staff can print it, send it on WhatsApp, or just close it.
 */
export default function FinalReceipt({ receipt: r, forStaff = false, onClose }) {
  const isOrder = r.kind === 'order'
  const closedAt = r.collectedAt || r.completedAt
  const phoneDigits = (r.customer?.phone || '').replace(/\D/g, '')
  const lines = r.items.map(i => `- ${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}${i.price != null ? ` (${naira(i.price * (i.qty || 1))})` : ''}`).join('\n')
  const shareText =
    `*22 Artistry Luxury Hairs*\n${isOrder ? 'Order' : 'FlexPay'} receipt ${r.number}\n${closedAt ? dateTime(closedAt) : ''}\n\n` +
    `Customer: ${r.customer?.name}\n${lines}\n` +
    (isOrder && r.deliveryFee != null && r.fulfilment === 'delivery' ? `Delivery: ${naira(r.deliveryFee)}\n` : '') +
    `*Total paid: ${naira(r.paid)}*\n\nThank you for choosing us!`

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Receipt">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm print:hidden" onClick={onClose} />

      <div className="print-area relative w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-3xl p-6"
        style={{ background: 'linear-gradient(150deg, rgba(48,8,34,0.95), rgba(16,0,11,0.97))', border: '1px solid rgba(255,255,255,0.14)' }}>
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-white print:hidden" aria-label="Close receipt">
          <X size={16} />
        </button>

        <div className="text-center mb-4">
          <img src="/logo-light.png" alt="" className="h-14 mx-auto print:hidden" />
          <img src="/logo.png" alt="" className="h-14 mx-auto hidden print:block" />
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            No. 13 Okpe Road, Opposite Wetland Microfinance Bank,<br />Sapele, Delta State · +234 907 534 1220
          </p>
        </div>

        <div className="text-center my-4">
          <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400">{isOrder ? 'Order receipt' : 'FlexPay receipt'}</p>
          <p className="font-mono text-lg text-white mt-1">{r.number}</p>
          <p className="mt-2 inline-block px-3 py-1 rounded-full border border-green-400/50 text-green-300 text-xs font-semibold tracking-widest">
            PAID IN FULL{r.status === 'collected' || isOrder ? ' · COMPLETED' : ''}
          </p>
        </div>

        <div>
          {closedAt && <Row label={r.status === 'collected' ? 'Handed over' : 'Completed'}>{dateTime(closedAt)}</Row>}
          <Row label="Customer">{r.customer?.name}</Row>
          {r.customer?.phone && <Row label="Phone">{r.customer.phone}</Row>}
          {isOrder && <Row label={r.fulfilment === 'delivery' ? 'Delivered to' : 'Collected at'}>{r.fulfilment === 'delivery' ? r.address : 'the salon'}</Row>}
          {!isOrder && <Row label="Plan">{r.weeks} weeks</Row>}
        </div>

        <p className="text-xs text-gray-400 mt-4 mb-1">Items</p>
        <ul className="text-sm">
          {r.items.map((i, k) => (
            <li key={k} className="flex justify-between gap-3 py-1.5 border-b border-white/10">
              <span className="text-gray-200">{i.name}{i.qty > 1 ? ` x${i.qty}` : ''}</span>
              {i.price != null && <span className="text-white shrink-0">{naira(i.price * (i.qty || 1))}</span>}
            </li>
          ))}
        </ul>

        <div className="mt-3 text-sm space-y-1">
          {isOrder && <div className="flex justify-between text-gray-300"><span>Items</span><span>{naira(r.subtotal)}</span></div>}
          {isOrder && r.fulfilment === 'delivery' && r.deliveryFee != null && <div className="flex justify-between text-gray-300"><span>Delivery</span><span>{naira(r.deliveryFee)}</span></div>}
          <div className="flex items-baseline justify-between pt-2">
            <span className="text-sm text-gray-300">Total paid</span>
            <span className="text-2xl font-bold text-white">{naira(r.paid)}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4 mb-1">Payments received</p>
        <ul className="text-xs">
          {r.payments.map((p, k) => (
            <li key={k} className="flex justify-between gap-3 py-1.5 border-b border-white/10">
              <span className="text-gray-300 min-w-0">{p.receiptNo} · {METHOD_LABEL[p.method] || p.method}<br /><span className="text-gray-500">{dateTime(p.date)}</span></span>
              <span className="text-white shrink-0">{naira(p.amount)}</span>
            </li>
          ))}
        </ul>

        <p className="text-center text-xs text-gray-400 mt-6">Thank you for choosing 22 Artistry Luxury Hairs.</p>

        <div className="flex gap-2 mt-5 print:hidden">
          <button onClick={() => window.print()} className="btn-outline flex-1 text-xs py-3"><Printer size={14} /> Print</button>
          {forStaff && phoneDigits ? (
            <a href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="btn-primary flex-1 text-xs py-3">
              <MessageCircle size={14} /> WhatsApp
            </a>
          ) : (
            <button onClick={onClose} className="btn-primary flex-1 text-xs py-3">{forStaff ? 'Skip' : 'Close'}</button>
          )}
        </div>
        {forStaff && phoneDigits && <button onClick={onClose} className="w-full text-center text-xs text-gray-400 hover:text-white mt-3 print:hidden">Skip, no need to print</button>}
      </div>
    </div>
  )
}
