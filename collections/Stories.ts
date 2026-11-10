import type { AccessResult, CollectionConfig } from 'payload'
const signedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)
const dateField = (name: string, label: string) => ({
  name, label, type: 'text' as const, required: true,
  validate: (value: string | null | undefined) =>
    (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value) || 'Use a valid date: YYYY-MM-DD',
})
export const Stories: CollectionConfig = {
  slug: 'stories', admin: { useAsTitle: 'title', defaultColumns: ['title', 'date', 'sport', '_status'] },
  versions: { drafts: true },
  access: {
    read: ({ req }): AccessResult => req.user ? true : { and: [
      { _status: { equals: 'published' } },
      { date: { less_than_equal: new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) } },
    ] },
    create: signedIn, update: signedIn, delete: signedIn,
  },
  fields: [
    { ...dateField('date', 'Publication date'), unique: true, index: true },
    dateField('event_date', 'Historical event date'),
    { name: 'title', type: 'text', required: true },
    { name: 'sport', type: 'text', required: true },
    { name: 'intro', type: 'textarea', required: true },
    { name: 'paragraphs', type: 'array', required: true, minRows: 1, fields: [
      { name: 'text', type: 'textarea', required: true },
    ] },
    { name: 'sources', type: 'array', required: true, minRows: 2, fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'url', type: 'text', required: true, validate: (value: string | null | undefined) => {
        try { return new URL(value || '').protocol === 'https:' || 'Use an HTTPS source URL' }
        catch { return 'Use a valid HTTPS source URL' }
      } },
    ] },
  ],
}
