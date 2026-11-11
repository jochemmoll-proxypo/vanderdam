import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../payload.config'
import { sportNames, sportKey, categoryForImport } from '../lib/sport-categories'
import archive from '../stories/index.json'
import { GET as getStories } from '../app/stories/index.json/route'
import { GET as getSports } from '../app/sports/index.json/route'

if (process.env.CATEGORY_TEST_DATABASE !== 'local-only' || !['127.0.0.1', 'localhost'].includes(new URL(process.env.DATABASE_URL || '').hostname)) {
  throw new Error('Run through npm run test:categories with its disposable local database.')
}
const payload = await getPayload({ config })
try {
  await assert.rejects(payload.create({ collection: 'sports', overrideAccess: false, data: { name: 'Unauthorized' } }))
  const admin = await payload.create({ collection: 'users', data: { email: 'test@example.invalid', password: 'local-category-test-password' } })
  const user = { ...admin, collection: 'users' as const }
  const allowed = await payload.create({ collection: 'sports', overrideAccess: false, user, data: { name: 'Admin-created sport' } })
  await assert.rejects(payload.update({ collection: 'sports', id: allowed.id, overrideAccess: false, data: { name: 'Unauthorized update' } }))
  await assert.rejects(payload.delete({ collection: 'sports', id: allowed.id, overrideAccess: false }))
  await payload.delete({ collection: 'sports', id: allowed.id, user, overrideAccess: false })
  const categories = await payload.find({ collection: 'sports', overrideAccess: false, pagination: false })
  assert.equal(categories.docs.length, new Set(archive.map(s => sportKey(s.sport))).size)
  const category = categories.docs[0]
  const renamed = await payload.update({ collection: 'sports', id: category.id, data: { name: '  Renamed category  ' } })
  assert.equal(renamed.name, 'Renamed category')
  assert.equal(sportNames([renamed]).get(sportKey(category.archiveLabel!)), 'Renamed category')
  const existing = await payload.find({ collection: 'stories', where: { sportCategory: { equals: category.id } }, overrideAccess: true, depth: 1 })
  assert(existing.docs.length > 0)
  assert.equal(typeof existing.docs[0].sportCategory === 'object' && existing.docs[0].sportCategory.name, 'Renamed category')
  const versions = await payload.findVersions({ collection: 'stories', where: { 'version.sportCategory': { equals: category.id } }, overrideAccess: true })
  assert(versions.totalDocs > 0)
  await assert.rejects(payload.delete({ collection: 'sports', id: category.id }), /used by stories/)
  assert.equal(await categoryForImport(payload, category.archiveLabel!), category.id)
  const created = await payload.create({ collection: 'sports', data: { name: 'New sport' } })
  const story = await payload.create({ collection: 'stories', data: { ...archive[0], date: '2026-01-01', sportCategory: created.id, paragraphs: archive[0].paragraphs.map(text => ({ text })), _status: 'published' } })
  assert.equal(story.sport, 'New sport')
  await assert.rejects(payload.delete({ collection: 'sports', id: created.id }), /used by stories/)
  await assert.rejects(payload.create({ collection: 'sports', data: { name: '   ' } }))
  await assert.rejects(payload.create({ collection: 'sports', data: { name: 'New sport' } }))
  await assert.rejects(payload.create({ collection: 'sports', data: { name: 'new SPORT' } }), /already used/)
  await assert.rejects(payload.create({ collection: 'sports', data: { name: category.archiveLabel! } }), /already used/)
  const empty = await payload.create({ collection: 'sports', data: { name: 'Unused sport' } })
  const publicCategories = await payload.find({ collection: 'sports', overrideAccess: false, pagination: false })
  assert(publicCategories.docs.some(c => c.id === empty.id))
  const sportFeed = await (await getSports()).json()
  assert(sportFeed.some((c: { name: string }) => c.name === 'Unused sport'))
  const storyFeed = await (await getStories()).json()
  for (const original of archive.filter(s => sportKey(s.sport) === sportKey(category.archiveLabel!))) {
    assert.equal(storyFeed.find((s: { date: string }) => s.date === original.date).sport, 'Renamed category')
  }
  assert.equal(storyFeed.find((s: { date: string }) => s.date === '2026-01-01').sport, 'New sport')
  await payload.delete({ collection: 'sports', id: empty.id })
  console.log('CMS integration passed: public reads, authenticated writes, category rename, populated relationships, saved versions, import mapping, new story, deletion protection and validation.')
} finally { await payload.destroy() }
