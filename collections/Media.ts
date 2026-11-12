import { APIError, type CollectionConfig } from 'payload'
import path from 'node:path'
import sharp from 'sharp'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Image', plural: 'Images' },
  admin: { useAsTitle: 'alt', defaultColumns: ['alt', 'filename', 'updatedAt'] },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  upload: {
    staticDir: process.env.LOCAL_MEDIA_DIR || path.resolve(process.cwd(), '.local-media'),
    disableLocalStorage: Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    resizeOptions: { width: 2400, height: 1600, fit: 'inside', withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 85 } },
    imageSizes: [
      { name: 'discover', width: 1200, height: 800, fit: 'cover' },
      { name: 'small', width: 800, height: 533, fit: 'cover', withoutEnlargement: true },
    ],
  },
  hooks: {
    beforeOperation: [async ({ req, operation }) => {
      if ((operation === 'create' || operation === 'update') && req.file && process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
        throw new APIError('Image storage is not configured. Connect Vercel Blob and set BLOB_READ_WRITE_TOKEN before uploading.', 503)
      }
      if (req.file && req.file.size > 3 * 1024 * 1024) {
        throw new APIError('Choose an image smaller than 3 MB.', 400)
      }
      if (req.file && (operation === 'create' || operation === 'update')) {
        const metadata = await sharp(req.file.data).metadata()
        const rotated = metadata.orientation && metadata.orientation >= 5
        const width = (rotated ? metadata.height : metadata.width) || 0
        const height = (rotated ? metadata.width : metadata.height) || 0
        if (width < 1200 || height < 800) throw new APIError('Choose an image at least 1200 × 800 pixels. The story header will be cropped to 1200 × 800.', 400)
      }
    }],
    beforeDelete: [async ({ id, req }) => {
      const stories = await req.payload.count({ collection: 'stories', where: { headerImage: { equals: id } }, overrideAccess: true, req })
      const versions = await req.payload.findVersions({ collection: 'stories', where: { 'version.headerImage': { equals: id } }, overrideAccess: true, limit: 1, req })
      if (stories.totalDocs || versions.totalDocs) throw new APIError('This image is used by a story or a saved version. Upload a replacement instead of deleting it.', 400)
    }],
  },
  fields: [
    { name: 'alt', label: 'Alt text', type: 'text', required: true,
      hooks: { beforeValidate: [({ value }) => typeof value === 'string' ? value.trim() : value] },
      validate: (value: string | null | undefined) => Boolean(value?.trim()) || 'Describe the image.',
      admin: { description: 'Describe the image for readers who cannot see it. Upload at least 1200 × 800 pixels; the header uses a 1200 × 800 crop.' } },
    { name: 'caption', type: 'text' },
    { name: 'credit', label: 'Photo credit', type: 'text', admin: { description: 'Photographer or source. Upload only images you have permission to publish.' } },
  ],
}
