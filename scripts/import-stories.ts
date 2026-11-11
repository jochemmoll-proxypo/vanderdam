import { getPayload } from 'payload'
import config from '../payload.config'
import archive from '../stories/index.json'
import { categoryForImport } from '../lib/sport-categories'

const payload = await getPayload({ config })
try {
  let imported = 0
  for (const story of archive) {
    const existing = await payload.find({
      collection: 'stories', where: { date: { equals: story.date } }, limit: 1,
      overrideAccess: true, draft: true,
    })
    if (existing.docs.length) continue
    const sportCategory = await categoryForImport(payload, story.sport)
    await payload.create({
      collection: 'stories', overrideAccess: true,
      data: { ...story, sportCategory, paragraphs: story.paragraphs.map(text => ({ text })), _status: 'published' },
    })
    imported++
  }
  payload.logger.info(`Imported ${imported} archive stories; existing CMS entries were preserved.`)
} finally {
  await payload.destroy()
}
