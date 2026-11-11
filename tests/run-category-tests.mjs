import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { spawn } from 'node:child_process'
const root=new URL('../', import.meta.url).pathname
const migration=readFileSync(root+'migrations/20261111_065650_sport_categories.ts','utf8')
const [up,down]=[...migration.matchAll(/await db.execute\(sql`([\s\S]*?)`\)/g)].map(x=>x[1])
const initial=[...readFileSync(root+'migrations/20261110_150344_initial.ts','utf8').matchAll(/await db.execute\(sql`([\s\S]*?)`\)/g)][0][1]
const db=new PGlite();await db.exec(initial)
const archive=JSON.parse(readFileSync(root+'stories/index.json','utf8'))
for(const s of archive){
 const {rows:[row]}=await db.query('INSERT INTO stories(date,event_date,title,sport,intro,_status) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[s.date,s.event_date,s.title,s.sport,s.intro,'published']);
 await db.query('INSERT INTO _stories_v(parent_id,version_sport,version_title,version__status,latest) VALUES($1,$2,$3,$4,true)',[row.id,s.sport,s.title,'published']);
}
await db.exec('BEGIN;'+up+'COMMIT;')
assert.equal((await db.query('SELECT count(*)::int AS n FROM stories WHERE sport_category_id IS NULL')).rows[0].n,0)
assert.equal((await db.query('SELECT count(*)::int AS n FROM _stories_v WHERE version_sport_category_id IS NULL')).rows[0].n,0)
const n=(await db.query('SELECT count(*)::int AS n FROM sports')).rows[0].n
assert.equal(n,new Set(archive.map(x=>x.sport.trim().toLowerCase())).size)
const {rows:[category]}=await db.query('SELECT * FROM sports ORDER BY id LIMIT 1')
const before=(await db.query('SELECT count(*)::int AS n FROM stories WHERE sport_category_id=$1',[category.id])).rows[0].n
await db.query('UPDATE sports SET name=$1 WHERE id=$2',['Renamed sport',category.id])
assert.equal((await db.query('SELECT count(*)::int AS n FROM stories s JOIN sports c ON s.sport_category_id=c.id WHERE c.name=$1',['Renamed sport'])).rows[0].n,before)
assert.equal((await db.query('SELECT archive_label FROM sports WHERE id=$1',[category.id])).rows[0].archive_label,category.archive_label)
await db.exec('BEGIN;'+down+'COMMIT;')
assert.equal((await db.query('SELECT count(*)::int AS n FROM stories')).rows[0].n,archive.length)
await db.exec('BEGIN;'+up+'COMMIT;')
assert.equal((await db.query('SELECT count(*)::int AS n FROM sports')).rows[0].n,n)
const server=new PGLiteSocketServer({db,port:0,host:'127.0.0.1',maxConnections:10})
await server.start()
try {
  const child=spawn(process.execPath, ['node_modules/payload/bin.js','run','tests/cms-categories.ts'], {
    cwd:root,stdio:'inherit',env:{...process.env,DATABASE_URL:`postgresql://postgres:postgres@${server.getServerConn()}/postgres`,PAYLOAD_SECRET:'local-category-integration-test-secret',CATEGORY_TEST_DATABASE:'local-only'},
  })
  const code=await new Promise((resolve,reject)=>{child.on('exit',resolve);child.on('error',reject)})
  assert.equal(code,0,'CMS integration tests failed')
} finally { await server.stop(); await db.close() }
console.log(`PostgreSQL migration passed: ${n} categories; ${archive.length} story assignments and versions preserved, rename, rollback and reapply.`)
