import { getPayload } from 'payload'
import config from '../payload.config'

if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Regenerating deployed images requires BLOB_READ_WRITE_TOKEN.')
const payload = await getPayload({ config })
try {
  const result = await payload.find({ collection: 'media', pagination: false, depth: 0, overrideAccess: true })
  let regenerated = 0
  let skipped = 0
  for (const image of result.docs) {
    if (image.sizes?.discover?.width === 1200 && image.sizes.discover.height === 800) continue
    if (!image.url || (image.width || 0) < 1200 || (image.height || 0) < 800) {
      payload.logger.warn(`Image ${image.id} needs a replacement source at least 1200 × 800 pixels.`)
      skipped++
      continue
    }
    const url = new URL(image.url)
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.blob.vercel-storage.com')) throw new Error('Expected a Vercel Blob source image.')
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error(`Unable to read source for image ${image.id}: ${response.status}`)
    const data = Buffer.from(await response.arrayBuffer())
    await payload.update({ collection: 'media', id: image.id, overrideAccess: true, data: {}, file: {
      data, name: image.filename || `image-${image.id}.webp`, mimetype: image.mimeType || 'image/webp', size: data.length,
    } })
    regenerated++
  }
  payload.logger.info(`Regenerated ${regenerated} image(s) at 1200 × 800; ${skipped} image(s) need replacement.`)
} finally { await payload.destroy() }
