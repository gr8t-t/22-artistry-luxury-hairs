import { useState } from 'react'
import { Star, Send, MessageSquare } from 'lucide-react'
import { useStore } from '../context/StoreContext'

function StarRating({ value, onChange, readOnly = false, size = 20 }) {
  const [hovered, setHovered] = useState(0)
  const display = readOnly ? value : (hovered || value)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type={readOnly ? 'button' : 'button'}
          disabled={readOnly}
          onClick={() => !readOnly && onChange(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className={`transition-transform ${!readOnly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            size={size}
            className={`transition-colors ${
              star <= display ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

const BLANK = { name: '', service: '', rating: 0, comment: '' }

const SERVICES = [
  'Professional Colouring', 'Frontal Installs', 'Machine Wigging',
  'Fixing of Nails', 'Lashes Extension', 'General Training', 'Sales of Luxury Hair', 'Other',
]

export default function Reviews() {
  const { reviews, addReview } = useStore()
  const approved = reviews.filter(r => r.approved)

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const avg = approved.length
    ? (approved.reduce((s, r) => s + r.rating, 0) / approved.length).toFixed(1)
    : null

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Please enter your name'
    if (!form.rating) e.rating = 'Please select a rating'
    if (!form.comment.trim()) e.comment = 'Please write a short review'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    addReview(form)
    setForm(BLANK)
    setErrors({})
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
  }

  const update = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  return (
    <section className="py-16 md:py-24 bg-brand-card border-y border-brand-border">
      <div className="page-section pt-0 pb-0">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="section-subtitle">Client Experiences</p>
          <h2 className="section-title">
            What Our Clients <span className="text-gradient">Say</span>
          </h2>
          {avg && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <StarRating value={Math.round(Number(avg))} readOnly size={18} />
              <span className="text-white font-playfair font-bold text-2xl">{avg}</span>
              <span className="text-gray-500 font-poppins text-sm">
                ({approved.length} {approved.length === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Reviews list */}
          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2 scrollbar-hide">
            {approved.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <MessageSquare size={36} className="text-brand-border mx-auto mb-3" />
                <p className="text-gray-400 font-poppins text-sm">
                  No reviews yet. Be the first to share your experience.
                </p>
              </div>
            ) : (
              approved.map(r => (
                <div key={r.id} className="glass-card rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-white font-poppins font-semibold text-sm">{r.name}</p>
                      {r.service && (
                        <p className="text-brand-pink text-xs font-poppins mt-0.5">{r.service}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <StarRating value={r.rating} readOnly size={14} />
                    </div>
                  </div>
                  <p className="text-gray-400 font-poppins text-sm leading-relaxed">
                    "{r.comment}"
                  </p>
                  <p className="text-gray-600 text-xs font-poppins mt-3">
                    {new Date(r.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Review form */}
          <div className="glass-card rounded-2xl p-6 md:p-7 border border-brand-pink/10 h-fit">
            <h3 className="font-playfair text-white font-bold text-xl mb-1">Leave a Review</h3>
            <p className="text-gray-500 font-poppins text-xs mb-6">
              Your review will appear after approval. Thank you for your feedback.
            </p>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                  <Star size={24} className="text-green-400 fill-green-400" />
                </div>
                <p className="text-white font-playfair font-semibold text-lg">Thank you!</p>
                <p className="text-gray-400 font-poppins text-sm mt-1">
                  Your review has been submitted for approval.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 font-poppins mb-1.5">Your Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={update('name')}
                    placeholder="e.g. Chioma A."
                    className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                  />
                  {errors.name && <p className="text-red-400 text-xs font-poppins mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-poppins mb-1.5">Service Received</label>
                  <select
                    value={form.service}
                    onChange={update('service')}
                    className="input-field appearance-none"
                  >
                    <option value="">Select service (optional)</option>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-poppins mb-2">Your Rating *</label>
                  <StarRating
                    value={form.rating}
                    onChange={(val) => {
                      setForm(prev => ({ ...prev, rating: val }))
                      setErrors(prev => ({ ...prev, rating: undefined }))
                    }}
                    size={24}
                  />
                  {errors.rating && <p className="text-red-400 text-xs font-poppins mt-1">{errors.rating}</p>}
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-poppins mb-1.5">Your Review *</label>
                  <textarea
                    rows={4}
                    value={form.comment}
                    onChange={update('comment')}
                    placeholder="Share your experience with us..."
                    className={`input-field resize-none ${errors.comment ? 'border-red-500' : ''}`}
                  />
                  {errors.comment && <p className="text-red-400 text-xs font-poppins mt-1">{errors.comment}</p>}
                </div>

                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                  <Send size={15} /> Submit Review
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
