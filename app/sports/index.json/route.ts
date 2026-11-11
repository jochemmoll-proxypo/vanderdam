import { getPayload } from 'payload'
import config from '@payload-config'
export const dynamic = 'force-dynamic'
export async function GET() {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'sports', overrideAccess: false, pagination: false, depth: 0, sort: 'name' })
  return Response.json(result.docs.map(({ name, archiveLabel }) => ({ name, archiveLabel })), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
