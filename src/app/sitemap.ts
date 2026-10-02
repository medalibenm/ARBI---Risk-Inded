import type { MetadataRoute } from 'next'

const APP_URL = process.env.APP_URL || 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/news', '/methodology'].map((path) => ({ url: `${APP_URL}${path}` }))
}
