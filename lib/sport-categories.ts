import type { Payload } from 'payload'
import type { Sport } from '../payload-types'

export const sportKey = (name: string) => name.trim().toLowerCase()
export function sportNames(categories: Sport[]) {
  const names = new Map<string, string>()
  for (const category of categories) {
    names.set(sportKey(category.name), category.name)
    if (category.archiveLabel) names.set(sportKey(category.archiveLabel), category.name)
  }
  return names
}
export async function categoryForImport(payload: Payload, label: string) {
  const result = await payload.find({ collection: 'sports', pagination: false, overrideAccess: true, depth: 0 })
  const key = sportKey(label)
  const existing = result.docs.find(c => sportKey(c.name) === key || (c.archiveLabel && sportKey(c.archiveLabel) === key))
  if (existing) return existing.id
  const created = await payload.create({ collection: 'sports', overrideAccess: true, data: { name: label.trim(), archiveLabel: label.trim() } })
  return created.id
}
