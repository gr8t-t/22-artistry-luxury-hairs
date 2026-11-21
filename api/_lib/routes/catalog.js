import { sql, logActivity } from '../db.js'
import { requireUser } from '../auth.js'
import { send, body, text, whole, uuid, imageUrl, HttpError } from '../http.js'
import { nairaToKobo, koboToNaira } from '../money.js'
import { notifyAllCustomers } from '../notify.js'

export const mapProduct = (p) => ({
  id: p.id, name: p.name, category: p.category, price: koboToNaira(p.price_kobo),
  quantity: p.quantity, description: p.description, image: p.image, featured: p.featured,
})
export const mapGallery = (g) => ({ id: g.id, url: g.url, caption: g.caption })
export const mapAnnouncement = (a) => ({
  id: a.id, title: a.title, message: a.message, imageUrl: a.image_url,
  expiresAt: new Date(a.expires_at).toISOString(), createdAt: new Date(a.created_at).toISOString(),
})
export const mapReview = (r) => ({
  id: r.id, name: r.name, service: r.service, rating: r.rating, comment: r.comment,
  approved: r.approved, createdAt: new Date(r.created_at).toISOString(),
})

/** Everything the public site needs, in one request. */
export async function publicCatalog(req, res) {
  const [products, gallery, announcements, reviews, videos] = await Promise.all([
    sql`select * from products order by created_at asc`,
    sql`select * from gallery_images order by created_at asc`,
    sql`select * from announcements order by created_at desc limit 50`,
    sql`select * from reviews where approved = true order by created_at desc limit 100`,
    sql`select * from showcase_videos order by created_at desc limit 1`,
  ])
  // Browsers always re-check; only Vercel's edge keeps a 10-second copy (never stale for longer).
  res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=10')
  send(res, 200, {
    products: products.map(mapProduct),
    gallery: gallery.map(mapGallery),
    announcements: announcements.map(mapAnnouncement),
    reviews: reviews.map(mapReview),
    video: videos[0] ? { id: videos[0].id, url: videos[0].url } : null,
  }, 'no-cache')
}

function readProduct(b) {
  const price = nairaToKobo(b.price)
  if (price === null) throw new HttpError(400, 'Price must be a valid amount')
  return {
    name: text(b.name, 'Product name', { required: true, max: 120 }),
    category: text(b.category || 'Hair', 'Category', { max: 40 }) || 'Hair',
    price,
    quantity: whole(b.quantity ?? 0, 'Quantity', { max: 100000 }),
    description: text(b.description, 'Description', { max: 1000 }),
    image: imageUrl(b.image, 'Product image'),
    featured: !!b.featured,
  }
}

export async function createProduct(req, res) {
  const u = await requireUser(req, ['manager'])
  const p = readProduct(body(req))
  const rows = await sql`insert into products (name, category, price_kobo, quantity, description, image, featured)
    values (${p.name}, ${p.category}, ${p.price}, ${p.quantity}, ${p.description}, ${p.image}, ${p.featured}) returning *`
  await logActivity(u.id, 'product.created', 'product', rows[0].id, { name: p.name })
  send(res, 201, { product: mapProduct(rows[0]) })
}

export async function updateProduct(req, res) {
  const u = await requireUser(req, ['manager'])
  const id = uuid(req.params.id)
  const p = readProduct(body(req))
  const rows = await sql`update products set name=${p.name}, category=${p.category}, price_kobo=${p.price},
    quantity=${p.quantity}, description=${p.description}, image=${p.image}, featured=${p.featured}
    where id=${id} returning *`
  if (!rows.length) throw new HttpError(404, 'Product not found')
  await logActivity(u.id, 'product.updated', 'product', id, { name: p.name })
  send(res, 200, { product: mapProduct(rows[0]) })
}

export async function deleteProduct(req, res) {
  const u = await requireUser(req, ['manager'])
  const id = uuid(req.params.id)
  const rows = await sql`delete from products where id=${id} returning name`
  if (!rows.length) throw new HttpError(404, 'Product not found')
  await logActivity(u.id, 'product.deleted', 'product', id, { name: rows[0].name })
  send(res, 200, { ok: true })
}

export async function createGalleryImage(req, res) {
  const u = await requireUser(req, ['manager'])
  const b = body(req)
  const url = imageUrl(b.url, 'Photo')
  if (!url) throw new HttpError(400, 'A photo is required')
  const caption = text(b.caption, 'Caption', { max: 120 })
  const rows = await sql`insert into gallery_images (url, caption) values (${url}, ${caption}) returning *`
  await logActivity(u.id, 'gallery.added', 'gallery', rows[0].id)
  send(res, 201, { image: mapGallery(rows[0]) })
}

export async function deleteGalleryImage(req, res) {
  const u = await requireUser(req, ['manager'])
  const id = uuid(req.params.id)
  const rows = await sql`delete from gallery_images where id=${id} returning id`
  if (!rows.length) throw new HttpError(404, 'Photo not found')
  await logActivity(u.id, 'gallery.deleted', 'gallery', id)
  send(res, 200, { ok: true })
}

export async function createAnnouncement(req, res) {
  const u = await requireUser(req, ['manager'])
  const b = body(req)
  const expires = new Date(b.expiresAt)
  if (Number.isNaN(expires.getTime())) throw new HttpError(400, 'Please choose a valid expiry date and time')
  const a = {
    title: text(b.title, 'Headline', { max: 120 }),
    message: text(b.message, 'Message', { max: 600 }),
    image: imageUrl(b.imageUrl, 'Flyer image'),
  }
  if (!a.title && !a.message && !a.image) throw new HttpError(400, 'Add a flyer, headline or message')
  const rows = await sql`insert into announcements (title, message, image_url, expires_at)
    values (${a.title}, ${a.message}, ${a.image}, ${expires.toISOString()}) returning *`
  await logActivity(u.id, 'announcement.created', 'announcement', rows[0].id, { title: a.title })
  await notifyAllCustomers({ type: 'offer', title: a.title || 'New announcement from 22 Artistry', body: a.message.slice(0, 140), url: '/announcements' })
  send(res, 201, { announcement: mapAnnouncement(rows[0]) })
}

export async function deleteAnnouncement(req, res) {
  const u = await requireUser(req, ['manager'])
  const id = uuid(req.params.id)
  const rows = await sql`delete from announcements where id=${id} returning id`
  if (!rows.length) throw new HttpError(404, 'Announcement not found')
  await logActivity(u.id, 'announcement.deleted', 'announcement', id)
  send(res, 200, { ok: true })
}

/** One-time helper: copy what the owner already added in this browser's old storage into the database. */
export async function importFromBrowser(req, res) {
  const u = await requireUser(req, ['manager'])
  const b = body(req)
  const list = (v) => (Array.isArray(v) ? v.slice(0, 200) : [])
  const safeImg = (v) => { try { return imageUrl(v) } catch { return '' } }
  const counts = { products: 0, gallery: 0, announcements: 0 }

  for (const p of list(b.products)) {
    const price = nairaToKobo(p?.price)
    const name = String(p?.name || '').trim().slice(0, 120)
    if (!name || price === null) continue
    await sql`insert into products (name, category, price_kobo, quantity, description, image, featured)
      values (${name}, ${String(p.category || 'Hair').slice(0, 40)}, ${price},
              ${Math.max(0, Math.min(100000, parseInt(p.quantity, 10) || 0))},
              ${String(p.description || '').slice(0, 1000)}, ${safeImg(p.image)}, ${!!p.featured})`
    counts.products++
  }
  for (const g of list(b.gallery)) {
    const url = safeImg(g?.url)
    if (!url) continue
    await sql`insert into gallery_images (url, caption) values (${url}, ${String(g.caption || '').slice(0, 120)})`
    counts.gallery++
  }
  for (const a of list(b.announcements)) {
    const exp = new Date(a?.expiresAt)
    if (Number.isNaN(exp.getTime())) continue
    await sql`insert into announcements (title, message, image_url, expires_at)
      values (${String(a.title || '').slice(0, 120)}, ${String(a.message || '').slice(0, 600)},
              ${safeImg(a.imageUrl)}, ${exp.toISOString()})`
    counts.announcements++
  }
  await logActivity(u.id, 'data.imported_from_browser', 'import', null, counts)
  send(res, 200, { imported: counts })
}

/* ── Home-page showcase video ── */
// Only videos hosted on our own Cloudinary account are accepted.
const VIDEO_URL = /^https:\/\/res\.cloudinary\.com\/dlexy6j8w\/video\/upload\/[^\s"'<>]{5,1500}$/

export async function setShowcaseVideo(req, res) {
  const u = await requireUser(req, ['manager'])
  const url = text(body(req).url, 'Video', { required: true, max: 2000 })
  if (!VIDEO_URL.test(url)) throw new HttpError(400, 'That video link is not valid. Please upload the video again.')
  await sql`delete from showcase_videos`
  const rows = await sql`insert into showcase_videos (url) values (${url}) returning *`
  await logActivity(u.id, 'video.set', 'video', rows[0].id)
  send(res, 201, { video: { id: rows[0].id, url: rows[0].url } })
}

export async function removeShowcaseVideo(req, res) {
  const u = await requireUser(req, ['manager'])
  await sql`delete from showcase_videos`
  await logActivity(u.id, 'video.removed', 'video', null)
  send(res, 200, { ok: true })
}
