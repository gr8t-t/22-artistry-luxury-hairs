// Cloudinary delivers phone videos (.mov / HEVC) as a web-friendly, size-limited MP4 on the fly.
// Original upload:  https://res.cloudinary.com/<cloud>/video/upload/v123/name.mov
const PARTS = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.+?)(\.[a-z0-9]+)?$/i

/** A compressed H.264 MP4 that plays on every phone and keeps data use low. */
export function videoSrc(url) {
  const m = PARTS.exec(url || '')
  if (!m) return url
  return `${m[1]}f_mp4,vc_h264,q_auto,w_1280,h_1280,c_limit/${m[2]}.mp4`
}

/** First frame of the video, shown instantly while the video loads. */
export function videoPoster(url) {
  const m = PARTS.exec(url || '')
  if (!m) return undefined
  return `${m[1]}so_0,f_jpg,q_auto,w_1280,h_1280,c_limit/${m[2]}.jpg`
}

export const CLOUDINARY_CLOUD = 'dlexy6j8w'
export const CLOUDINARY_PRESET = 'artistry_uploads'
export const MAX_VIDEO_MB = 100

/** Upload a video from the phone/computer to Cloudinary with live progress (0-100). */
export function uploadVideo(file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', CLOUDINARY_PRESET)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)) }
    xhr.onerror = () => reject(new Error('Upload failed. Check your internet connection and try again.'))
    xhr.ontimeout = () => reject(new Error('Upload timed out. Try again on a stronger connection.'))
    xhr.onload = () => {
      let data = {}
      try { data = JSON.parse(xhr.responseText) } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) return resolve(data)
      reject(new Error(data.error?.message || 'Upload failed. Please try again.'))
    }
    xhr.send(fd)
  })
}
