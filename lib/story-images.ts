import type { Media } from '../payload-types'

export function publicStoryImage(image: number | Media | null | undefined) {
  if (!image || typeof image !== 'object' || !image.url) return null
  const header = image.sizes?.discover
  return {
    url: header?.url || image.url, alt: image.alt,
    width: header?.width || image.width, height: header?.height || image.height,
    largeUrl: image.url, largeWidth: image.width, largeHeight: image.height,
    smallUrl: image.sizes?.small?.url || null, smallWidth: image.sizes?.small?.width || null,
    caption: image.caption || null, credit: image.credit || null,
    focalX: image.focalX ?? 50, focalY: image.focalY ?? 50,
  }
}
