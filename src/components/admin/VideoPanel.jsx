import { useRef, useState } from 'react'
import { Video, Upload, Trash2, RefreshCw, CheckCircle } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { uploadVideo, videoSrc, videoPoster, MAX_VIDEO_MB } from '../../lib/video'

export default function VideoPanel() {
  const { video, setShowcaseVideo, removeShowcaseVideo } = useStore()
  const inputRef = useRef(null)
  const [progress, setProgress] = useState(null) // null = idle, 0-100 = uploading, 101 = saving
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const busy = progress !== null

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(''); setDone(false)
    if (!file.type.startsWith('video/')) return setError('Please choose a video file.')
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      return setError(`That video is ${Math.round(file.size / 1024 / 1024)} MB. The limit is ${MAX_VIDEO_MB} MB. Trim or compress it, then try again.`)
    }
    try {
      setProgress(0)
      const data = await uploadVideo(file, setProgress)
      setProgress(101)
      const saved = await setShowcaseVideo(data.secure_url)
      if (saved) setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setProgress(null)
    }
  }

  const remove = async () => {
    if (!window.confirm('Remove the video from the home page?')) return
    setDone(false)
    await removeShowcaseVideo()
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <Video size={20} className="text-brand-pink" />
        <h2 className="font-playfair text-white font-semibold text-xl">Home page video</h2>
      </div>
      <p className="text-gray-300 font-poppins text-sm mb-6 leading-relaxed">
        This is the video that plays on the home page under "Our work". It plays by itself on a loop with no sound.
        Edit all your clips into <b className="text-white">one video</b> first, then upload it here.
      </p>

      {video ? (
        <div className="glass-card p-4 mb-5">
          <p className="text-xs text-gray-300 font-poppins mb-3 flex items-center gap-2"><CheckCircle size={14} className="text-green-400" /> Currently on the home page</p>
          <div className="rounded-2xl overflow-hidden bg-black mx-auto" style={{ maxWidth: 320, maxHeight: 420 }}>
            <video
              src={videoSrc(video.url)}
              poster={videoPoster(video.url)}
              muted loop playsInline autoPlay
              className="w-full h-full object-contain"
              style={{ maxHeight: 420 }}
            />
          </div>
        </div>
      ) : (
        <div className="glass-card p-8 mb-5 text-center">
          <Video size={40} className="text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-poppins text-sm">No video yet. The home page hides this section until you upload one.</p>
        </div>
      )}

      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={pick} />

      {busy ? (
        <div className="glass-card p-5">
          <div className="flex justify-between text-sm font-poppins text-gray-200 mb-2">
            <span>{progress > 100 ? 'Saving…' : 'Uploading…'}</span>
            <span>{progress > 100 ? '' : `${progress}%`}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={Math.min(progress, 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-brand-pink transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 font-poppins mt-3">Keep this page open until it finishes.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button onClick={() => inputRef.current?.click()} className="btn-primary">
            {video ? <><RefreshCw size={15} /> Replace video</> : <><Upload size={15} /> Upload video</>}
          </button>
          {video && (
            <button onClick={remove} className="btn-outline text-red-300 hover:text-white">
              <Trash2 size={15} /> Remove
            </button>
          )}
        </div>
      )}

      {done && !busy && <p className="text-green-300 text-sm font-poppins mt-4">Done. The new video is live on the home page.</p>}
      {error && <p className="text-red-400 text-sm font-poppins mt-4" role="alert">{error}</p>}

      <ul className="text-xs text-gray-400 font-poppins mt-6 space-y-1.5 leading-relaxed list-disc pl-5">
        <li>Best length: 15 to 60 seconds. Maximum file size: {MAX_VIDEO_MB} MB.</li>
        <li>Phone videos work (MP4 or MOV). Vertical or horizontal both look good.</li>
        <li>Uploading a new video replaces the old one.</li>
      </ul>
    </div>
  )
}
