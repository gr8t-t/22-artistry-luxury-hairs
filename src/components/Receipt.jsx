import { X, Printer, MessageCircle } from 'lucide-react'
import { naira, dateTime, PURPOSE_LABEL, METHOD_LABEL } from '../lib/format'

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-white/10 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white text-right font-medium">{children}</span>
    </div>
  )
}

/** Receipt modal. Prints cleanly on white paper and can be sent to the customer on WhatsApp. */
export default function Receipt({ payment: p, onClose }) {
  const reversed = p.status === 'reversed'
  const phoneDigits = (p.customerPhone || '').replace(/\D/g, '')

  const shareText =
    `*22 Artistry Luxury Hairs*\nReceipt ${p.receiptNo}\n` +
    `${dateTime(p.createdAt)}\n\n` +
    `Customer: ${p.customerName}\n` +
    `${PURPOSE_LABEL[p.purpose] || p.purpose}${p.description ? ' - ' + p.description : ''}\n` +
    `Paid by: ${METHOD_LABEL[p.method] || p.method}\n` +
    `*Amount: ${naira(p.amount)}*` +
    (reversed ? '\n\nThis payment was reversed.' : '') +
    `\n\nThank you for choosing us!`

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Receipt">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm print:hidden" onClick={onClose} />

      <div className="print-area relative w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-3xl p-6"
        style={{
          background: 'linear-gradient(150deg, rgba(48,8,34,0.95), rgba(16,0,11,0.97))',
          border: '1px solid rgba(255,255,255,0.14)',
        }}>
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
          <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400">Payment receipt</p>
          <p className="font-mono text-lg text-white mt-1">{p.receiptNo}</p>
          {reversed && (
            <p className="mt-2 inline-block px-3 py-1 rounded-full border border-red-400/50 text-red-300 text-xs font-semibold tracking-widest">REVERSED</p>
          )}
        </div>

        <div>
          <Row label="Date">{dateTime(p.createdAt)}</Row>
          <Row label="Customer">{p.customerName}</Row>
          {p.customerPhone && <Row label="Phone">{p.customerPhone}</Row>}
          <Row label="For">{PURPOSE_LABEL[p.purpose] || p.purpose}</Row>
          {p.description && <Row label="Details">{p.description}</Row>}
          <Row label="Paid by">{METHOD_LABEL[p.method] || p.method}</Row>
          {p.reference && <Row label="Reference">{p.reference}</Row>}
          <Row label="Served by">{p.recordedBy}</Row>
        </div>

        <div className="flex items-baseline justify-between mt-4 pt-3">
          <span className="text-sm text-gray-300">Amount paid</span>
          <span className={`text-2xl font-bold ${reversed ? 'line-through text-gray-500' : 'text-white'}`}>{naira(p.amount)}</span>
        </div>
        {reversed && p.reverseReason && (
          <p className="text-xs text-red-300 mt-2">Reason: {p.reverseReason}</p>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">Thank you for choosing 22 Artistry Luxury Hairs.</p>

        <div className="flex gap-2 mt-5 print:hidden">
          <button onClick={() => window.print()} className="btn-outline flex-1 text-xs py-3"><Printer size={14} /> Print</button>
          <a
            href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(shareText)}`}
            target="_blank" rel="noreferrer"
            className="btn-primary flex-1 text-xs py-3"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
