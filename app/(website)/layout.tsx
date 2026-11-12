import type { Metadata, Viewport } from 'next'
export const metadata: Metadata = {
  title: 'This Day in Sports — Sporting history, day by day',
  description: 'A remarkable story from sporting history, every day. On this day, told again.',
  robots: { index: true, follow: true, googleBot: { 'max-image-preview': 'large' } },
}
export const viewport: Viewport = { themeColor: '#f4f1e9' }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><link rel="stylesheet" href="/assets/style.css" /></head><body>{children}</body></html>
}
