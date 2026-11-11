import assert from 'node:assert/strict'
import type { Payload } from 'payload'
import type { User } from '../payload-types'
import sharp from 'sharp'
import { GET as getStories } from '../app/stories/index.json/route'

export async function testHeaderImages(payload: Payload, user: User & { collection: 'users' }) {
  const data = await sharp({ create: { width: 1200, height: 600, channels: 3, background: '#182d29' } }).png().toBuffer()
  const file = { data, name: 'header-test.png', mimetype: 'image/png', size: data.length }
  await assert.rejects(payload.create({ collection: 'media', overrideAccess: false, data: { alt: 'Unauthorized' }, file }))
  const wasVercel = process.env.VERCEL
  try {
    process.env.VERCEL = '1'
    await assert.rejects(payload.create({ collection: 'media', data: { alt: 'Missing storage' }, file }), /storage is not configured/)
  } finally { process.env.VERCEL = wasVercel }
  const media = await payload.create({ collection: 'media', overrideAccess: false, user, data: { alt: 'A test sports image', caption: 'Test caption', credit: 'Test photographer' }, file })
  assert(media.url?.includes('/api/media/file/'))
  assert.equal(media.mimeType, 'image/webp')
  assert.equal(media.width, 1200)
  assert(media.sizes?.small?.url)
  const story = (await payload.find({ collection: 'stories', pagination: false, overrideAccess: true })).docs[0]
  await payload.update({ collection: 'stories', id: story.id, data: { headerImage: media.id, _status: 'published' } })
  const feed = await (await getStories()).json()
  const rendered = feed.find((s: { date: string }) => s.date === story.date)
  assert.equal(rendered.headerImage.alt, 'A test sports image')
  assert.equal(rendered.headerImage.caption, 'Test caption')
  assert.equal(rendered.headerImage.credit, 'Test photographer')
  assert.equal(rendered.headerImage.width, 1200)
  assert.equal(rendered.headerImage.smallWidth, 800)
  await assert.rejects(payload.delete({ collection: 'media', id: media.id }), /used by a story/)
  await assert.rejects(payload.update({ collection: 'media', id: media.id, overrideAccess: false, data: { alt: 'Unauthorized' } }))
  await assert.rejects(payload.create({ collection: 'media', data: { alt: '   ' }, file }))
  await assert.rejects(payload.create({ collection: 'media', data: { alt: 'SVG' }, file: { data: Buffer.from('<svg></svg>'), name: 'unsafe.svg', mimetype: 'image/svg+xml', size: 11 } }))
  await assert.rejects(payload.create({ collection: 'media', data: { alt: 'Oversize' }, file: { ...file, size: 3 * 1024 * 1024 + 1 } }), /smaller than 3 MB/)
  const unused = await payload.create({ collection: 'media', data: { alt: 'Unused image' }, file: { ...file, name: 'unused.png' } })
  await payload.delete({ collection: 'media', id: unused.id })
  await payload.update({ collection: 'stories', id: story.id, data: { headerImage: null, _status: 'published' } })
  const withoutImage = await (await getStories()).json()
  assert.equal(withoutImage.find((s: { date: string }) => s.date === story.date).headerImage, null)
  console.log('Header images passed: authenticated upload, WebP resizing, thumbnail, public feed, alt text, caption, credit, removal, deletion protection and file validation.')
}
