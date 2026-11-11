import { APIError, type CollectionConfig } from 'payload'
import archive from '../stories/index.json'

export const Sports: CollectionConfig = {
  slug: 'sports',
  labels: { singular: 'Sport category', plural: 'Sport categories' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'updatedAt'] },
  defaultSort: 'name',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeValidate: [async ({ data, originalDoc, req }) => {
      if (typeof data?.name !== 'string') return data
      const name = data.name.trim().toLowerCase()
      const categories = await req.payload.find({ collection: 'sports', pagination: false, overrideAccess: true, depth: 0, req })
      if (categories.docs.some(category => category.id !== originalDoc?.id &&
        (category.name.toLowerCase() === name || category.archiveLabel?.toLowerCase() === name))) {
        throw new APIError('That sport name is already used by another category or its archive label.', 400)
      }
      return data
    }],
    beforeDelete: [async ({ id, req }) => {
      const category = await req.payload.findByID({ collection: 'sports', id, req, depth: 0 })
      const used = await req.payload.count({ collection: 'stories', where: { sportCategory: { equals: id } }, overrideAccess: true, req })
      const history = await req.payload.findVersions({ collection: 'stories', where: { 'version.sportCategory': { equals: id } }, limit: 1, overrideAccess: true, req })
      const inArchive = archive.some(story => story.sport.trim().toLowerCase() === category.archiveLabel?.trim().toLowerCase())
      if (used.totalDocs || history.totalDocs || inArchive) {
        throw new APIError('This sport is used by stories or their history. Rename it instead of deleting it.', 400)
      }
    }],
  },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true,
      hooks: { beforeValidate: [({ value }) => typeof value === 'string' ? value.trim() : value] },
      validate: (value: string | null | undefined) => Boolean(value?.trim()) || 'Enter a sport name.',
    },
    { name: 'archiveLabel', type: 'text', unique: true, admin: { hidden: true }, access: { create: () => false, update: () => false } },
  ],
}
