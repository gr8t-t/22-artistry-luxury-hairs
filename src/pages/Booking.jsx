import { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { CheckCircle, Calendar, Clock, User, Phone, MessageSquare, Scissors } from 'lucide-react'

const SERVICES = [
  'Professional Colouring',
  'Sales of Luxury Hair',
  'Revamping Specialist',
  'Professional Machine Wigging',
  'Frontal Installs',
  'Fixing of Nails',
  'Lashes Extension',
  'General Training Program',
]

const TIME_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM',
  '3:00 PM', '4:00 PM', '5:00 PM',
]

const INITIAL = { name: '', phone: '', service: '', date: '', time: '', notes: '' }

export default function Booking() {
  const { addBooking } = useStore()
  const [form, setForm] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!form.service) e.service = 'Please select a service'
    if (!form.date) e.date = 'Please choose a date'
    if (!form.time) e.time = 'Please choose a time'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)

    setTimeout(() => {
      const booking = addBooking(form)

      // Open WhatsApp with booking details
      const msg = `Hello 22 Artistry! I'd like to book an appointment.\n\n` +
        `*Name:* ${form.name}\n` +
        `*Phone:* ${form.phone}\n` +
        `*Service:* ${form.service}\n` +
        `*Date:* ${form.date}\n` +
        `*Time:* ${form.time}\n` +
        (form.notes ? `*Notes:* ${form.notes}\n` : '') +
        `\nPlease confirm my booking. Thank you!`

      window.open(`https://wa.me/2349075341220?text=${encodeURIComponent(msg)}`, '_blank')
      setLoading(false)
      setSubmitted(true)
    }, 800)
  }

  const update = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  if (submitted) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6 animate-pulse-pink">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          <h2 className="font-playfair text-3xl font-bold text-white">Booking Submitted!</h2>
          <p className="text-gray-400 font-poppins mt-3">
            We've opened WhatsApp to confirm your appointment. Our team will reach out shortly.
          </p>
          <div className="mt-6 glass-card rounded-xl p-5 text-left space-y-2">
            <p className="text-sm text-gray-400 font-poppins"><span className="text-brand-pink font-semibold">Service:</span> {form.service}</p>
            <p className="text-sm text-gray-400 font-poppins"><span className="text-brand-pink font-semibold">Date:</span> {form.date}</p>
            <p className="text-sm text-gray-400 font-poppins"><span className="text-brand-pink font-semibold">Time:</span> {form.time}</p>
          </div>
          <button
            onClick={() => { setForm(INITIAL); setSubmitted(false) }}
            className="btn-primary mt-6"
          >
            Book Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 min-h-screen">
      {/* Header */}
      <div className="relative bg-brand-card border-b border-brand-border py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/5 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <p className="section-subtitle">Reserve Your Spot</p>
          <h1 className="section-title text-4xl md:text-5xl">
            Book an <span className="text-gradient">Appointment</span>
          </h1>
          <p className="text-gray-400 font-poppins mt-3 max-w-lg mx-auto">
            Fill in the form below and we'll confirm via WhatsApp within the hour.
          </p>
        </div>
      </div>

      <div className="page-section">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Info sidebar */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-playfair text-white font-semibold text-lg mb-4">Opening Hours</h3>
              <ul className="space-y-3">
                {[
                  { day: 'Mon – Fri', time: '9:00 AM – 7:00 PM' },
                  { day: 'Saturday', time: '9:00 AM – 6:00 PM' },
                  { day: 'Sunday', time: 'By Appointment Only' },
                ].map(h => (
                  <li key={h.day} className="flex justify-between text-sm font-poppins">
                    <span className="text-gray-400">{h.day}</span>
                    <span className="text-white">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-playfair text-white font-semibold text-lg mb-4">Our Services</h3>
              <ul className="space-y-2">
                {SERVICES.map(s => (
                  <li key={s} className="flex items-start gap-2 text-sm font-poppins text-gray-400">
                    <Scissors size={13} className="text-brand-pink mt-1 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <a
              href="https://wa.me/2349075341220"
              target="_blank"
              rel="noreferrer"
              className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:border-green-500/40 transition-colors block"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-poppins font-semibold text-sm">Prefer WhatsApp?</p>
                <p className="text-gray-400 text-xs font-poppins">Chat directly with us</p>
              </div>
            </a>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 glass-card rounded-2xl p-6 md:p-8 space-y-5">
            <h3 className="font-playfair text-white font-bold text-xl mb-2">Appointment Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-poppins text-gray-400 mb-1.5">Full Name *</label>
                <div className="relative">
                  <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={update('name')}
                    placeholder="Your full name"
                    className={`input-field pl-10 ${errors.name ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.name && <p className="text-red-400 text-xs font-poppins mt-1">{errors.name}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-poppins text-gray-400 mb-1.5">Phone Number *</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={update('phone')}
                    placeholder="+234..."
                    className={`input-field pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.phone && <p className="text-red-400 text-xs font-poppins mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Service */}
            <div>
              <label className="block text-sm font-poppins text-gray-400 mb-1.5">Service *</label>
              <div className="relative">
                <Scissors size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <select
                  value={form.service}
                  onChange={update('service')}
                  className={`input-field pl-10 appearance-none ${errors.service ? 'border-red-500' : ''}`}
                >
                  <option value="">Select a service…</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {errors.service && <p className="text-red-400 text-xs font-poppins mt-1">{errors.service}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Date */}
              <div>
                <label className="block text-sm font-poppins text-gray-400 mb-1.5">Preferred Date *</label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="date"
                    value={form.date}
                    onChange={update('date')}
                    min={new Date().toISOString().split('T')[0]}
                    className={`input-field pl-10 ${errors.date ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.date && <p className="text-red-400 text-xs font-poppins mt-1">{errors.date}</p>}
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-poppins text-gray-400 mb-1.5">Preferred Time *</label>
                <div className="relative">
                  <Clock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <select
                    value={form.time}
                    onChange={update('time')}
                    className={`input-field pl-10 appearance-none ${errors.time ? 'border-red-500' : ''}`}
                  >
                    <option value="">Choose a time…</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {errors.time && <p className="text-red-400 text-xs font-poppins mt-1">{errors.time}</p>}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-poppins text-gray-400 mb-1.5">Additional Notes</label>
              <div className="relative">
                <MessageSquare size={15} className="absolute left-4 top-4 text-gray-500" />
                <textarea
                  value={form.notes}
                  onChange={update('notes')}
                  rows={4}
                  placeholder="Any specific requests or details about your hair/style…"
                  className="input-field pl-10 resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
            >
              {loading ? (
                <><span className="spinner scale-75" />Submitting…</>
              ) : (
                <>Confirm Booking via WhatsApp</>
              )}
            </button>
            <p className="text-center text-gray-500 text-xs font-poppins">
              Clicking "Confirm" will open WhatsApp to finalise your booking.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
