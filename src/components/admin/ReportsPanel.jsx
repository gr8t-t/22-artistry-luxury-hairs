import { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, RefreshCw, Banknote, Users, Undo2, ChevronRight, CheckCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { naira, PURPOSE_LABEL } from '../../lib/format'

const box = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }
const PERIODS = [['today', 'Today'], ['week', 'Last 7 days'], ['month', 'This month']]
const ORDER_TEXT = { new: 'New', confirmed: 'Confirmed', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' }
const BOOKING_TEXT = { pending: 'Waiting', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' }

const dayName = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })
const dayNum = (iso) => Number(iso.slice(8, 10))

function Card({ title, children }) {
  return (
    <div className="glass-card p-6">
      <h3 className="font-playfair text-white font-semibold text-lg mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Stat({ Icon, label, value, sub }) {
  return (
    <div className="rounded-xl p-4" style={box}>
      <p className="text-xs text-gray-300 font-poppins flex items-center gap-1.5">{Icon && <Icon size={13} className="text-brand-pink" />} {label}</p>
      <p className="text-white font-bold text-2xl mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 font-poppins mt-0.5">{sub}</p>}
    </div>
  )
}

function Bar({ value, max }) {
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1.5">
      <div className="h-full bg-brand-pink" style={{ width: `${max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0}%` }} />
    </div>
  )
}

export default function ReportsPanel({ onGo }) {
  const [period, setPeriod] = useState('today')
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [stamp, setStamp] = useState(null)

  const load = useCallback(async (p) => {
    setBusy(true)
    try { setD(await api('/admin/reports?period=' + p)); setErr(''); setStamp(new Date()) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }, [])
  useEffect(() => {
    load(period)
    const t = setInterval(() => load(period), 60000) // keeps itself up to date while it is open
    return () => clearInterval(t)
  }, [period, load])

  if (err && !d) return <p className="text-red-300 text-sm" role="alert">{err}</p>
  if (!d) return <div className="spinner mx-auto my-8" aria-label="Loading" />

  const n = d.now
  const attention = [
    [n.ordersWaiting, `new order${n.ordersWaiting === 1 ? '' : 's'} waiting to be confirmed`, 'Orders'],
    [n.flexpay.stopRequests, `FlexPay stop request${n.flexpay.stopRequests === 1 ? '' : 's'} for you to decide`, 'FlexPay'],
    [n.refunds.count, `Hair Wallet refund request${n.refunds.count === 1 ? '' : 's'} (${naira(n.refunds.amount)})`, 'Wallet'],
    [n.bookingsPending, `booking request${n.bookingsPending === 1 ? '' : 's'} waiting`, 'Bookings'],
    [n.flexpay.behindCount, `FlexPay plan${n.flexpay.behindCount === 1 ? '' : 's'} behind on payments (${naira(n.flexpay.behindAmount)})`, 'FlexPay'],
    [n.flexpay.waitingFirstPayment, `FlexPay plan${n.flexpay.waitingFirstPayment === 1 ? '' : 's'} waiting for the first payment`, 'FlexPay'],
    [n.flexpay.readyToCollect, `fully paid plan${n.flexpay.readyToCollect === 1 ? '' : 's'} ready to hand over`, 'FlexPay'],
    [n.lowStock.length, `product${n.lowStock.length === 1 ? '' : 's'} running low: ${n.lowStock.slice(0, 3).map(p => `${p.name} (${p.quantity})`).join(', ')}${n.lowStock.length > 3 ? '…' : ''}`, 'Products'],
  ].filter(([c]) => c > 0)

  const maxDay = Math.max(1, ...d.daily.map(x => x.amount))
  const maxMethod = Math.max(d.moneyIn.cash, d.moneyIn.pos, d.moneyIn.transfer, 1)
  const maxPurpose = Math.max(1, ...d.moneyIn.byPurpose.map(p => p.amount))
  const maxStaff = Math.max(1, ...d.staff.map(s => s.amount))

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-playfair text-white font-semibold text-xl flex items-center gap-2"><LayoutDashboard size={20} className="text-brand-pink" /> Overview</h2>
          <button onClick={() => load(period)} className="text-xs text-gray-300 hover:text-white font-poppins flex items-center gap-1.5" aria-label="Refresh">
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> {stamp ? `Updated ${stamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Refresh'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-full mt-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {PERIODS.map(([id, t]) => (
            <button key={id} onClick={() => setPeriod(id)} className={`py-2 rounded-full text-sm font-poppins transition-all ${period === id ? 'bg-brand-pink text-white' : 'text-gray-300 hover:text-white'}`}>{t}</button>
          ))}
        </div>
        {err && <p className="text-red-300 text-sm mt-3" role="alert">{err}</p>}
      </div>

      <Card title="Needs your attention">
        {attention.length === 0 ? (
          <p className="text-green-300 text-sm font-poppins flex items-center gap-2"><CheckCircle size={16} /> All clear. Nothing is waiting for you.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {attention.map(([count, text, tab]) => (
              <li key={text}>
                <button onClick={() => onGo(tab, null)} className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors">
                  <span className="text-sm font-poppins text-gray-100"><b className="text-white">{count}</b> {text}</span>
                  <span className="text-brand-pink text-xs font-poppins flex items-center shrink-0">{tab} <ChevronRight size={14} /></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat Icon={Banknote} label="Money in" value={naira(d.moneyIn.total)} sub="cash, POS and transfer" />
        <Stat label="Payments recorded" value={d.payments} sub={d.walletSpent.count ? `${d.walletSpent.count} from Hair Wallet (${naira(d.walletSpent.amount)})` : undefined} />
        <Stat Icon={Users} label="New customers" value={d.newCustomers.online + d.newCustomers.inSalon} sub={`${d.newCustomers.online} online, ${d.newCustomers.inSalon} in-salon`} />
        <Stat Icon={Undo2} label="Payments reversed" value={d.reversed.count} sub={d.reversed.count ? naira(d.reversed.amount) : 'none'} />
      </div>

      <Card title="How customers paid">
        <div className="grid sm:grid-cols-3 gap-4">
          {[['Cash', d.moneyIn.cash], ['POS (card)', d.moneyIn.pos], ['Bank transfer', d.moneyIn.transfer]].map(([t, v]) => (
            <div key={t}><div className="flex justify-between text-sm font-poppins"><span className="text-gray-300">{t}</span><span className="text-white font-semibold">{naira(v)}</span></div><Bar value={v} max={maxMethod} /></div>
          ))}
        </div>
      </Card>

      <Card title="Money in, last 14 days">
        <div className="flex items-end gap-1.5 h-36" role="img" aria-label="Bar chart of money received each day for the last 14 days">
          {d.daily.map((x, i) => (
            <div key={x.date} className="flex-1 flex flex-col items-center justify-end h-full" title={`${dayName(x.date)} ${dayNum(x.date)}: ${naira(x.amount)}`}>
              <div className={`w-full rounded-t ${i === 13 ? 'bg-brand-pink' : 'bg-brand-pink/50'}`} style={{ height: `${x.amount > 0 ? Math.max(3, (x.amount / maxDay) * 100) : 1}%`, minHeight: 2 }} />
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mt-2">
          {d.daily.map((x, i) => <span key={x.date} className={`flex-1 text-center text-[10px] font-poppins ${i === 13 ? 'text-white' : 'text-gray-500'}`}>{dayNum(x.date)}</span>)}
        </div>
        <p className="text-xs text-gray-400 font-poppins mt-2">Best day: {naira(maxDay === 1 && d.daily.every(x => x.amount === 0) ? 0 : maxDay)}</p>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="What the money was for">
          {d.moneyIn.byPurpose.length === 0 ? <p className="text-gray-400 text-sm font-poppins">No payments in this period.</p> : (
            <ul className="space-y-3">
              {d.moneyIn.byPurpose.map(p => (
                <li key={p.purpose}><div className="flex justify-between text-sm font-poppins"><span className="text-gray-300">{PURPOSE_LABEL[p.purpose] || p.purpose} <span className="text-gray-500">x{p.count}</span></span><span className="text-white font-semibold">{naira(p.amount)}</span></div><Bar value={p.amount} max={maxPurpose} /></li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recorded by your team">
          {d.staff.length === 0 ? <p className="text-gray-400 text-sm font-poppins">No payments in this period.</p> : (
            <ul className="space-y-3">
              {d.staff.map(s => (
                <li key={s.name}><div className="flex justify-between text-sm font-poppins"><span className="text-gray-300">{s.name} <span className="text-gray-500">{s.count} payment{s.count === 1 ? '' : 's'}</span></span><span className="text-white font-semibold">{naira(s.amount)}</span></div><Bar value={s.amount} max={maxStaff} /></li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Orders">
          {d.orders.total === 0 ? <p className="text-gray-400 text-sm font-poppins">No orders in this period.</p> : (
            <ul className="text-sm font-poppins divide-y divide-white/10">
              {Object.keys(ORDER_TEXT).filter(k => d.orders.byStatus[k]).map(k => <li key={k} className="py-2 flex justify-between"><span className="text-gray-300">{ORDER_TEXT[k]}</span><span className="text-white font-semibold">{d.orders.byStatus[k]}</span></li>)}
            </ul>
          )}
          <h4 className="text-white text-sm font-semibold mt-5 mb-2">Best sellers</h4>
          {d.topProducts.length === 0 ? <p className="text-gray-400 text-sm font-poppins">None yet.</p> : (
            <ul className="text-sm font-poppins divide-y divide-white/10">
              {d.topProducts.map(t => <li key={t.name} className="py-2 flex justify-between gap-3"><span className="text-gray-300 truncate">{t.name}</span><span className="text-white shrink-0">{t.qty} sold · {naira(t.value)}</span></li>)}
            </ul>
          )}
        </Card>
        <Card title="Bookings">
          {d.bookings.total === 0 ? <p className="text-gray-400 text-sm font-poppins">No booking requests in this period.</p> : (
            <ul className="text-sm font-poppins divide-y divide-white/10">
              {Object.keys(BOOKING_TEXT).filter(k => d.bookings.byStatus[k]).map(k => <li key={k} className="py-2 flex justify-between"><span className="text-gray-300">{BOOKING_TEXT[k]}</span><span className="text-white font-semibold">{d.bookings.byStatus[k]}</span></li>)}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Money held and owed (right now)">
        <div className="grid sm:grid-cols-3 gap-3">
          <Stat label="Held in customers' Hair Wallets" value={naira(n.walletHeld)} sub="money you owe as services" />
          <Stat label="Still to be paid on FlexPay" value={naira(n.flexpay.outstanding)} sub={`${n.flexpay.open} open plan${n.flexpay.open === 1 ? '' : 's'}`} />
          <Stat label="Referral rewards paid" value={naira(d.rewards.referralPaid)} sub={`${d.rewards.treatmentsRedeemed} free treatment${d.rewards.treatmentsRedeemed === 1 ? '' : 's'} given`} />
        </div>
      </Card>
    </div>
  )
}
