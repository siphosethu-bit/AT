import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Seo } from '../components/Seo'
import { artist } from '../content/artist'
import type { LiveEvent } from '../content/types'
import { useSiteContent } from '../context/SiteContentContext'
import { ArtistContentManager } from '../components/ArtistContentManager'
import type { ContentEntry } from '../lib/siteContent'
import { Link, useRouter } from '../lib/router'
import { ApiError, bookingStatuses, bookingStatusLabels, requestJson, type BookingEnquiry, type BookingStatus } from '../lib/booking'
import { sampleEnquiries } from '../lib/artistDeskDemo'
import { formatLiveEventDate, getLiveEventStatus, sortLiveEvents } from '../lib/liveEvents'
import '../styles/artist-desk.css'

type DeskView = 'desk' | 'enquiries' | 'shows' | 'releases'
type ArtistUser = { id: string; email: string }
type ShowConnection = { configured: boolean; events: { id: string; title: string; date: string; venue: string; city: string; url: string; importData: LiveEvent | null }[] }

function SampleChart() {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
  const values = [2100, 3400, 2900, 4800, 6100, 8200]
  return <section className="desk-chart" aria-labelledby="desk-chart-title">
    <header><div><p className="desk-label">A sense of momentum</p><h2 id="desk-chart-title">The listening room is growing.</h2></div><span className="desk-badge">Sample data</span></header>
    <div className="desk-chart__metric"><strong>8.2k</strong><span>illustrative monthly listeners<br />April–September 2026</span></div>
    <svg viewBox="0 0 600 150" preserveAspectRatio="none" role="img" aria-label="Sample monthly listeners: April 2100, May 3400, June 2900, July 4800, August 6100, September 8200. Not live analytics.">
      <defs><linearGradient id="desk-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#bd3823" stopOpacity=".16" /><stop offset="1" stopColor="#bd3823" stopOpacity="0" /></linearGradient></defs>
      {[35, 80, 125].map((y) => <line key={y} x1="10" x2="590" y1={y} y2={y} stroke="#d5cec3" strokeDasharray="3 6" />)}
      <path d="M10 120 L126 101 L242 108 L358 80 L474 61 L590 30 L590 145 L10 145Z" fill="url(#desk-chart-fill)" />
      <path d="M10 120 L126 101 L242 108 L358 80 L474 61 L590 30" fill="none" stroke="#bd3823" strokeWidth="2" />
      {[120,101,108,80,61,30].map((y,i) => <circle key={y} cx={10+i*116} cy={y} r="3.5" fill="#bd3823"><title>{months[i]}: {values[i].toLocaleString()} sample listeners</title></circle>)}
    </svg>
    <div className="desk-chart__months" aria-hidden="true">{months.map((month) => <span key={month}>{month}</span>)}</div>
    <p className="desk-footnote">A design preview, not Spotify analytics. No listening service is connected.</p>
  </section>
}

function EnquiryDetail({ enquiry, preview, onClose, onSave }: {
  enquiry: BookingEnquiry; preview: boolean; onClose: () => void;
  onSave: (enquiry: BookingEnquiry) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [status, setStatus] = useState(enquiry.status)
  const [notes, setNotes] = useState(enquiry.private_notes)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close() }, [])
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { await onSave({ ...enquiry, status, private_notes: notes }); setMessage(preview ? 'Sample updated for this preview only.' : 'Changes saved to the booking desk.') }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save changes.') }
    finally { setBusy(false) }
  }
  return <dialog className="enquiry-drawer" ref={dialog} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }} aria-labelledby="enquiry-title">
    <header><p className="desk-label">{enquiry.reference}</p><button type="button" className="desk-text-button" disabled={busy} onClick={onClose}>Close ×</button></header>
    <p className="desk-label">Performance enquiry {preview && ' / Fictional example'}</p>
    <h2 id="enquiry-title">{enquiry.details.venue}</h2>
    <p className="enquiry-drawer__contact">{enquiry.details.who}<br />{enquiry.details.email}</p>
    <dl className="enquiry-facts">
      <div><dt>Proposed date</dt><dd>{enquiry.details.date}</dd></div>
      <div><dt>City</dt><dd>{enquiry.details.city}</dd></div>
      <div><dt>Format</dt><dd>{enquiry.details.format || 'To discuss'}</dd></div>
      <div><dt>Audience</dt><dd>{enquiry.details.audience || 'To discuss'}</dd></div>
    </dl>
    <section className="enquiry-message"><h3>The room they have in mind</h3><p>{enquiry.details.room || 'No additional details supplied.'}</p></section>
    {preview ? <p className="desk-footnote">Email replies are disabled for fictional contacts.</p> :
      <a className="desk-button" href={`mailto:${enquiry.details.email}?subject=${encodeURIComponent(`Re: ${enquiry.reference} / ${enquiry.details.venue}`)}`}>Reply by email ↗</a>}
    <form className="enquiry-manage" onSubmit={save}>
      <label htmlFor="enquiry-status">Where things stand</label>
      <select id="enquiry-status" value={status} onChange={(event) => setStatus(event.target.value as BookingStatus)}>{bookingStatuses.map((value) => <option key={value} value={value}>{bookingStatusLabels[value]}</option>)}</select>
      <label htmlFor="enquiry-notes">Private notes <span>Only visible to your team</span></label>
      <textarea id="enquiry-notes" rows={4} maxLength={4000} placeholder="Fee discussed, rider to send, a detail to remember…" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <p className="desk-footnote">Status changes are internal. They do not notify the organiser or publish a show.</p>
      <button type="submit" className="desk-button" disabled={busy}>{busy ? 'Saving…' : preview ? 'Update sample' : 'Save changes'}</button>
      {message && <p className="desk-feedback" role="status">{message}</p>}{error && <p className="desk-feedback is-error" role="alert">{error}</p>}
    </form>
  </dialog>
}

export function AdminPage() {
  const { shows: liveEvents } = useSiteContent()
  const { pathname, navigate } = useRouter()
  const preview = pathname === '/admin/preview'
  const [user, setUser] = useState<ArtistUser | null>(null)
  const [checking, setChecking] = useState(!preview)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<DeskView>('desk')
  const [enquiries, setEnquiries] = useState<BookingEnquiry[]>(preview ? sampleEnquiries : [])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<BookingEnquiry | null>(null)
  const [shows, setShows] = useState<ShowConnection | null>(null)
  const [showError, setShowError] = useState('')
  const [importedShow, setImportedShow] = useState<ContentEntry | null>(null)
  const clearImportedShow = useCallback(() => setImportedShow(null), [])

  useEffect(() => {
    const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex,nofollow'; document.head.appendChild(robots)
    return () => robots.remove()
  }, [])
  useEffect(() => {
    if (preview) return
    let ignore = false
    requestJson<{ user: ArtistUser }>('/api/artist-session').then((data) => { if (!ignore) setUser(data.user) }).catch((error) => {
      if (!ignore && error instanceof ApiError && error.status !== 401) setAuthMessage(error.message)
    }).finally(() => { if (!ignore) setChecking(false) })
    return () => { ignore = true }
  }, [preview])

  const loadEnquiries = useCallback(async (offset = 0) => {
    if (preview) return
    setLoading(true); setLoadError('')
    try {
      const data = await requestJson<{ enquiries: BookingEnquiry[]; hasMore: boolean }>(`/api/artist-enquiries?offset=${offset}`)
      setEnquiries((current) => offset ? [...current, ...data.enquiries.filter((row) => !current.some((item) => item.id === row.id))] : data.enquiries)
      setHasMore(data.hasMore)
    } catch (error) {
      if (error instanceof ApiError && [401,403].includes(error.status)) { setUser(null); setEnquiries([]); setSelected(null); setAuthMessage(error.message) }
      else setLoadError(error instanceof Error ? error.message : 'Unable to load enquiries.')
    } finally { setLoading(false) }
  }, [preview])
  useEffect(() => { if (user && !preview) void loadEnquiries() }, [user, preview, loadEnquiries])

  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setAuthMessage('')
    try { const data = await requestJson<{ user: ArtistUser }>('/api/artist-session', { method: 'POST', body: JSON.stringify({ email, password }) }); setUser(data.user); setPassword('') }
    catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Unable to sign in.') }
    finally { setBusy(false) }
  }
  async function signOut() {
    setBusy(true)
    try {
      await requestJson('/api/artist-session', { method: 'DELETE' })
      setUser(null); setEnquiries([]); setSelected(null); setShows(null); setAuthMessage('You are signed out.')
    } catch { setLoadError('Could not sign out. Please try again.') }
    finally { setBusy(false) }
  }
  async function saveEnquiry(updated: BookingEnquiry) {
    if (!preview) await requestJson('/api/artist-enquiries', { method: 'PATCH', body: JSON.stringify({ id: updated.id, status: updated.status, notes: updated.private_notes }) })
    setEnquiries((current) => current.map((row) => row.id === updated.id ? updated : row))
  }
  async function checkShows() {
    setBusy(true); setShowError('')
    try { setShows(await requestJson<ShowConnection>('/api/artist-shows')) }
    catch (error) { setShowError(error instanceof Error ? error.message : 'Could not check the connection.') }
    finally { setBusy(false) }
  }
  const newCount = enquiries.filter((row) => row.status === 'new').length
  const conversationCount = enquiries.filter((row) => row.status === 'reviewing').length
  const confirmedCount = enquiries.filter((row) => row.status === 'confirmed').length
  const visible = enquiries.filter((row) => (filter === 'all' || row.status === filter) &&
    `${row.details.who} ${row.details.venue} ${row.details.city} ${row.reference}`.toLowerCase().includes(query.toLowerCase()))
  const upcoming = sortLiveEvents(liveEvents.filter((show) => getLiveEventStatus(show) !== 'past'))
  const nextShow = upcoming[0]

  return <div className="artist-space">
    <Seo title="Artist desk | Internet Athi" description="Private artist booking desk." path="/admin" />
    <header className="artist-header"><Link to="/" className="artist-wordmark">internet athi</Link><span className="artist-header__edition">The studio / Artist desk</span><div><Link to="/">View website ↗</Link>{user && !preview && <button type="button" onClick={signOut} disabled={busy}>Sign out</button>}</div></header>
    {!user && !preview ? <main className="artist-login" id="main-content">
      <section className="artist-login__intro"><p className="desk-label">A quieter space for the work behind the work.</p><h1>Behind<br /><em>the music.</em></h1><p>Conversations to continue.<br />Rooms to fill. A next chapter to plan.</p><div className="artist-record" aria-hidden="true"><span>IA</span></div></section>
      <section className="artist-login__form"><p className="desk-label">For the artist & the team</p><h2>Welcome back.</h2><p>Sign in to your private booking desk.</p>
        <form onSubmit={signIn}><label htmlFor="artist-email">Email address</label><input id="artist-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} placeholder="Your artist account email" />
          <label htmlFor="artist-password">Password</label><div className="artist-password"><input id="artist-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={1024} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div>
          <button type="submit" className="desk-button" disabled={checking || busy}>{checking ? 'Checking session…' : busy ? 'Signing in…' : 'Enter the studio →'}</button>
          {authMessage && <p className="desk-feedback" role="status">{authMessage}</p>}
        </form>
        <p className="desk-footnote">Access is by invitation. If you need account access or a password reset, contact your site administrator.</p>
        <div className="artist-preview-link"><span>Want to see how it feels?</span><Link to="/admin/preview">Explore the sample desk ↗</Link><small>Fictional enquiries. No login or private data.</small></div>
      </section>
    </main> : <>
      {preview && <div className="desk-preview-banner"><span><strong>Preview mode</strong> · Fictional enquiries and sample metrics. Changes last only while this page is open.</span><button type="button" onClick={() => navigate('/admin')}>Go to real sign in →</button></div>}
      <div className="artist-workspace">
        <aside className="desk-navigation"><p className="desk-label">Artist dashboard</p><nav aria-label="Artist desk">{([['desk','Overview'],['enquiries','Enquiries'],['shows','Live & shows'],['releases','Releases']] as const).map(([key,label],index) => <button type="button" key={key} aria-current={view === key ? 'page' : undefined} onClick={() => { setView(key); setSelected(null) }}><span>0{index+1}</span>{label}{key === 'enquiries' && newCount > 0 && <b>{newCount}</b>}</button>)}</nav><p className="desk-navigation__note">Make space<br />for the music.<span>Internet Athi<br />Cape Town, South Africa</span></p></aside>
        <main className="desk-content" id="main-content">
          <div className="desk-dateline"><p className="desk-label">Internet Athi / {view === 'shows' ? 'The live programme' : 'Booking correspondence'}</p><span>{preview ? '12 September 2026 · Sample' : new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span></div>
          <header className="desk-heading"><h1>{view === 'desk' ? <>Your studio, <em>at a glance.</em></> : view === 'enquiries' ? <>Booking <em>enquiries.</em></> : view === 'releases' ? <>Your recorded <em>world.</em></> : <>The live <em>programme.</em></>}</h1><p>{view === 'desk' ? 'Your booking pipeline, next performance and publishing tools.' : view === 'enquiries' ? 'The people, places and possibilities waiting for your reply.' : view === 'releases' ? 'Artwork, music and the stories taking their place in the archive.' : 'Prepare a show, place it on the map and publish when you are ready.'}</p>{view === 'desk' && <div className="desk-quick-actions"><button type="button" className="desk-text-button" onClick={() => setView('shows')}>+ Manage shows</button><button type="button" className="desk-text-button" onClick={() => setView('releases')}>+ Manage releases</button></div>}</header>
          {loadError && <div className="desk-feedback is-error" role="alert">{loadError}<button className="desk-text-button" type="button" onClick={() => void loadEnquiries()}>Try again</button></div>}
          {(view === 'desk' || view === 'enquiries') && <>
            <div className="desk-totals" aria-label="Enquiry summary">{[['new','Awaiting your reply',newCount],['reviewing','In conversation',conversationCount],['confirmed','Confirmed bookings',confirmedCount]].map(([key,label,count]) => <button key={key} type="button" onClick={() => { setFilter(String(key)); setView('enquiries') }}><span>{label}</span><strong>{loading && !enquiries.length ? '—' : count}<i>↗</i></strong></button>)}</div>
            {hasMore && <p className="desk-footnote">Counts cover loaded enquiries. Load more in Enquiries to include older requests.</p>}
            {view === 'desk' ? <div className="desk-overview-grid"><section className="desk-inbox"><header className="desk-section-heading"><h2>First things first.</h2><button type="button" className="desk-text-button" onClick={() => { setFilter('all'); setView('enquiries') }}>All enquiries ↗</button></header>
              <p className="desk-footnote">New conversations, ready when you are.</p>
              {enquiries.filter((row) => row.status === 'new').slice(0,3).map((row) => <button className="desk-enquiry-row" type="button" key={row.id} onClick={() => setSelected(row)}><span className="desk-enquiry-dot" /><span><strong>{row.details.venue}</strong><small>{row.details.city} · {row.details.date}</small><small>{row.details.who}</small></span><span aria-hidden="true">↗</span></button>)}
              {!newCount && <div className="desk-empty"><p>{loading ? 'Opening your correspondence…' : loadError ? 'Your correspondence is unavailable.' : 'A clear desk.'}</p><span>{!loadError && !loading && 'New website enquiries will appear here. Nothing needs your reply right now.'}</span></div>}
            </section><aside className="desk-next"><p className="desk-label">Next on stage {preview && '/ Sample'}</p><h2>{preview ? 'After Hours' : nextShow?.title || 'The next room is waiting.'}</h2><p>{preview ? '03 October 2026 · Cape Town' : nextShow ? `${formatLiveEventDate(nextShow)} · ${nextShow.city}` : 'No upcoming public show is listed yet.'}</p><div className="desk-next__score" aria-hidden="true">{Array.from({ length: 36 }, (_,i) => <i key={i} style={{ height: `${12 + ((i*17+9)%49)}px` }} />)}</div><button type="button" className="desk-text-button" onClick={() => setView('shows')}>Open the live programme ↗</button></aside><SampleChart /></div> : <section className="desk-all-enquiries">
              <div className="desk-enquiry-tools"><label><span className="sr-only">Search enquiries</span><input type="search" placeholder="Search a name, room or city…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label><span className="sr-only">Filter enquiries by status</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All enquiries</option>{bookingStatuses.map((status) => <option key={status} value={status}>{bookingStatusLabels[status]}</option>)}</select></label>{!preview && <button type="button" className="desk-text-button" disabled={loading} onClick={() => void loadEnquiries()}>Refresh</button>}</div>
              <div className="desk-table-head" aria-hidden="true"><span>Room / organiser</span><span>Proposed date</span><span>Where things stand</span></div>
              {visible.map((row) => <button className="desk-table-row" key={row.id} type="button" onClick={() => setSelected(row)}><span><strong>{row.details.venue}</strong><small>{row.details.who} · {row.details.city}</small></span><span>{row.details.date}</span><span><i className={`desk-status desk-status--${row.status}`}>{bookingStatusLabels[row.status]}</i><b aria-hidden="true">↗</b></span></button>)}
              {!visible.length && <p className="desk-empty">{loading ? 'Loading enquiries…' : 'No enquiries match this view.'}</p>}
              {hasMore && <button type="button" className="desk-button" disabled={loading} onClick={() => void loadEnquiries(enquiries.length)}>{loading ? 'Loading…' : 'Load older enquiries'}</button>}
            </section>}
          </>}
          {view === 'shows' && <>
            <ArtistContentManager kind="show" preview={preview} imported={importedShow} onImportUsed={clearImportedShow} />
            <div className="desk-shows"><section className="desk-shows__connection"><p className="desk-label">Connected stage / Bandsintown</p><h2>Bring your dates<br />into the picture.</h2><p>Fetch your upcoming Bandsintown events, review their map locations, then publish them to this website. Announcements on Bandsintown itself are managed in Bandsintown for Artists.</p><span className="desk-badge">{shows?.configured ? 'Connected · Review before publishing' : 'Awaiting connection'}</span><ol className="desk-connection-steps"><li><span>01</span>Confirm your artist profile and approved API access.</li><li><span>02</span>Fetch dates and review their location details.</li><li><span>03</span>Publish each approved show to your map.</li></ol><div className="desk-inline-actions"><a className="desk-button" href="https://artists.bandsintown.com/" target="_blank" rel="noopener noreferrer">Open Bandsintown ↗</a><button type="button" className="desk-text-button" disabled={busy || preview} onClick={checkShows}>{busy ? 'Checking…' : 'Fetch Bandsintown dates'}</button></div>{preview && <p className="desk-footnote">Connection checks are available after artist sign-in.</p>}{shows && !shows.configured && <p className="desk-feedback" role="status">No API credentials configured yet. Your existing live page is unchanged.</p>}{showError && <p className="desk-feedback is-error" role="alert">{showError}</p>}</section>
            <section className="desk-shows__list"><p className="desk-label">{shows?.configured ? 'Fetched from Bandsintown' : 'On your website'}</p><h2>The live programme.</h2>{shows?.configured ? (shows.events.length ? shows.events.map((show) => <article key={show.id}><small>{show.date.slice(0,10)}</small><h3>{show.title || show.venue}</h3><p>{show.venue} · {show.city}</p><a className="desk-text-button" href={show.url} target="_blank" rel="noopener noreferrer">View on Bandsintown ↗</a>{show.importData ? <button type="button" className="desk-button" onClick={() => setImportedShow({ id: show.importData!.id, kind: 'show', state: 'draft', data: show.importData!, updated_at: new Date().toISOString() })}>Review for the map →</button> : <p className="desk-footnote">This event is outside the current South African map or is missing location details.</p>}</article>) : <p>No upcoming events returned by Bandsintown.</p>) : upcoming.length ? upcoming.map((show) => <article key={show.id}><small>{formatLiveEventDate(show)}</small><h3>{show.title}</h3><p>{show.venue} · {show.city}</p></article>) : <div className="desk-empty"><p>No upcoming public dates.</p><span>A confirmed enquiry is not automatically a public show. Agree the details and announce when you are ready.</span></div>}<Link to="/live" className="desk-text-button">Visit the public live page ↗</Link></section></div>
          </>}
          {view === 'releases' && <ArtistContentManager kind="release" preview={preview} />}
          <footer className="desk-footer"><span>Internet Athi · The studio</span><span>{preview ? 'Sample workspace · No real bookings' : 'Private correspondence · Artist & team only'}</span></footer>
        </main>
      </div>
      {selected && <EnquiryDetail key={selected.id} enquiry={selected} preview={preview} onClose={() => setSelected(null)} onSave={saveEnquiry} />}
    </>}
    {!preview && !user && <footer className="artist-login-footer"><span>Internet Athi · Cape Town, South Africa</span><a href={`mailto:${artist.bookingEmail}`}>Looking to book a show?</a></footer>}
  </div>
}
