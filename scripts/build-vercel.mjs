import { spawnSync } from 'node:child_process'

function run(script, args = []) {
  const result = spawnSync('npm', ['run', script, ...args], { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}

// Only explicitly configured previews migrate during a build. Production uses
// the reviewed, separate migration step documented in README.md.
if (process.env.VERCEL_ENV === 'preview' && process.env.PREVIEW_MIGRATIONS === 'true') {
  const host = new URL(process.env.DATABASE_URL || '').hostname
  if (!process.env.PREVIEW_DATABASE_HOST || host !== process.env.PREVIEW_DATABASE_HOST) {
    throw new Error('Preview migrations require DATABASE_URL to match PREVIEW_DATABASE_HOST.')
  }
  run('migrate', ['--', '--force-accept-warning'])
  if (process.env.PREVIEW_REGENERATE_IMAGES === 'true') run('regenerate:images')
}
run('build')
