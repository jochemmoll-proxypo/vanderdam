import { cp, mkdir } from 'node:fs/promises'
await mkdir('public', { recursive: true })
await cp('assets', 'public/assets', { recursive: true })
