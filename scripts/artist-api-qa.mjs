import assert from 'node:assert/strict'
import { build } from 'esbuild'

// No real accounts, provider calls or database writes: isolate all external boundaries.
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-test-secret'
process.env.ARTIST_ADMIN_USER_IDS = 'approved-artist'
process.env.APP_ORIGIN = 'https://test.example'
const handlers = {}
for (const name of ['artist-session','artist-enquiries','artist-content','artist-upload','artist-shows','site-content','booking']) {
  const compiled = await build({ entryPoints: [`api/${name}.ts`], bundle: true, platform: 'node', format: 'esm', write: false })
  handlers[name] = (await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)).default
}
let requests = []
let mockFetch = () => { throw new Error('Unexpected external request') }
globalThis.fetch = async (url, init = {}) => { requests.push({ url: String(url), init }); return mockFetch(String(url),init) }
const json = (data,status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type':'application/json' } })
async function call(name, method = 'GET', body, headers = {}, query = {}) {
  requests = []
  const result = { status: 200, headers: {}, data: null }
  const res = { setHeader: (key,value) => { result.headers[key.toLowerCase()] = value; return res }, status: (value) => { result.status=value; return res }, json: (data) => { result.data=data; return res } }
  await handlers[name]({ method, body, query, headers, socket: { remoteAddress: '127.0.0.1' } },res)
  return result
}
const trusted = { origin: 'https://test.example', 'content-type': 'application/json', cookie: 'athi_artist_session=valid.token' }
const passed = []
for (const endpoint of ['artist-enquiries','artist-content','artist-upload','artist-shows']) {
  const result = await call(endpoint)
  assert.equal(result.status,401); assert.equal(requests.length,0)
}
passed.push('Private endpoints reject anonymous requests without touching storage')
mockFetch = () => json({ id:'not-approved',email:'outsider@example.com' })
assert.equal((await call('artist-enquiries','GET',null,trusted)).status,403)
passed.push('An authenticated but non-allowlisted user cannot read artist data')
mockFetch = () => json({ access_token:'secret.session.token', expires_in:3600, user:{id:'approved-artist',email:'artist@example.com'} })
const login = await call('artist-session','POST',{email:'artist@example.com',password:'long-test-password'},trusted)
assert.equal(login.status,200)
assert.match(login.headers['set-cookie'],/HttpOnly; SameSite=Strict/)
assert.match(login.headers['set-cookie'],/Secure/)
assert(!JSON.stringify(login.data).includes('token'))
assert.equal((await call('artist-session','POST',{}, {...trusted,origin:'https://evil.example'})).status,403)
passed.push('Login sets an HttpOnly/Secure cookie, exposes no token and blocks cross-origin mutation')
const verified = () => json({id:'approved-artist',email:'artist@example.com'})
mockFetch = verified
assert.equal((await call('artist-content','PUT',{},trusted)).status,400)
assert.equal((await call('artist-upload','POST',{base64:Buffer.from('<svg onload="alert(1)">').toString('base64')},trusted)).status,400)
passed.push('Malformed publication and SVG upload are rejected server-side')
const id = 'cms-550e8400-e29b-41d4-a716-446655440000'
const release = { id,kind:'release',state:'draft',data:{id,title:'QA release',releaseType:'Single',year:2026,image:'https://images.example.com/cover.jpg',spotifyUrl:'https://open.spotify.com/album/123abc',alt:'Sample artwork'} }
let stored = []
mockFetch = (url,init) => {
  if (url.includes('/auth/v1/user')) return verified()
  if (url.includes('/rest/v1/site_content') && init.method === 'POST') { stored=[JSON.parse(init.body)]; return json(stored) }
  if (url.includes('state=eq.published')) return json(stored.filter((entry) => entry.state === 'published'))
  throw new Error('Unexpected fetch')
}
assert.equal((await call('artist-content','PUT',release,trusted)).status,200)
assert(!(await call('site-content')).data.releases.some((row) => row.title === 'QA release'))
assert.equal((await call('artist-content','PUT',{...release,state:'published'},trusted)).status,200)
assert.equal((await call('site-content')).data.releases[0].title,'QA release')
assert.equal((await call('artist-content','PUT',{...release,state:'published',data:{...release.data,spotifyUrl:'javascript:alert(1)'}},trusted)).status,400)
passed.push('Drafts stay private; published releases reach the public feed; unsafe links fail validation')
const show = {id,kind:'show',state:'published',data:{id,title:'QA show',venue:'The room',city:'Cape Town',region:'Western Cape',latitude:-33.92,longitude:18.42,startDateTime:'2026-10-24T19:00:00+02:00'}}
assert.equal((await call('artist-content','PUT',show,trusted)).status,200)
assert((await call('site-content')).data.shows.some((row) => row.title === 'QA show'))
assert.equal((await call('artist-content','PUT',{...show,data:{...show.data,latitude:0}},trusted)).status,400)
passed.push('Published performances reach the map feed and invalid coordinates are rejected')
const brief = { id:'550e8400-e29b-41d4-a716-446655440000', consent:true, website:'', details:{venue:'QA room',city:'Cape Town',date:'24 Oct 2026',format:'live ensemble',audience:'100',email:'test@example.com',room:'test',who:'QA organiser'} }
mockFetch = () => json('IA-TEST-01')
assert.equal((await call('booking','POST',brief,trusted)).data.reference,'IA-TEST-01')
assert.equal((await call('booking','POST',{...brief,consent:false},trusted)).status,400)
mockFetch = () => json({message:'submission_limit'},400)
assert.equal((await call('booking','POST',brief,trusted)).status,429)
mockFetch = () => { throw new Error('offline') }
assert.equal((await call('booking','POST',brief,trusted)).status,503)
passed.push('Booking requires consent, handles rate limits and never reports success on a storage failure')
mockFetch = () => json({},204)
// 204 cannot contain a body; use an empty response for logout.
mockFetch = () => new Response(null,{status:204})
assert.match((await call('artist-session','DELETE',null,trusted)).headers['set-cookie'],/Max-Age=0/)
passed.push('Sign-out clears the private cookie')
console.log(JSON.stringify({passed},null,2))
