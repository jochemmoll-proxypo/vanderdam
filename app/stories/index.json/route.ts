import { getPayload } from 'payload'
import config from '@payload-config'
import archive from '../../../stories/index.json'
export const dynamic = 'force-dynamic'
export async function GET() {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'stories', overrideAccess: false, pagination: false, depth: 0 })
  const stories = new Map(archive.map(story => [story.date, story]))
  for (const story of result.docs) {
    stories.set(story.date, {
      date: story.date, event_date: story.event_date, title: story.title,
      sport: story.sport, intro: story.intro,
      paragraphs: story.paragraphs.map(p => p.text),
      sources: story.sources.map(s => ({ title: s.title, url: s.url })),
    })
  }
  return Response.json([...stories.values()].sort((a, b) => b.date.localeCompare(a.date)), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
