import { useEffect, useRef, useState, type FormEvent } from 'react'
import { requestJson } from '../lib/booking'
import type { DiscographyRelease, LiveEvent } from '../content/types'
import { provinces, validateContent, type ContentEntry, type ContentKind } from '../lib/siteContent'
import { findCityDirectoryEntry, southAfricaCityDirectory } from '../data/southAfricaCityDirectory'

interface Props { kind: ContentKind; preview: boolean; imported?: ContentEntry | null; onImportUsed?: () => void }
function blank(kind: ContentKind): ContentEntry {
  const id = `cms-${crypto.randomUUID()}`
  return { id, kind, state: 'draft', updated_at: new Date().toISOString(), data: kind === 'release' ? {
    id, title: '', releaseType: 'Single', year: new Date().getFullYear(), image: '', spotifyUrl: '', alt: '',
  } : { id, slug: id, title: '', startDateTime: '', timezone: 'Africa/Johannesburg', venue: '', city: '', region: '', country: 'South Africa', latitude: 0, longitude: 0, ticketUrl: '', description: '' } }
}
export function ArtistContentManager({ kind, preview, imported, onImportUsed }: Props) {
  const [entries, setEntries] = useState<ContentEntry[]>([])
  const [editing, setEditing] = useState<ContentEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [uploading, setUploading] = useState(false)
  const [localArtwork, setLocalArtwork] = useState('')
  const panel = useRef<HTMLDivElement>(null)
  const formHeading = useRef<HTMLHeadingElement>(null)
  const label = kind === 'show' ? 'show' : 'release'
  const load = async () => {
    if (preview) return
    setLoading(true); setError('')
    try { const data = await requestJson<{ entries: ContentEntry[] }>('/api/artist-content'); setEntries(data.entries) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load content.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [preview]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (imported?.kind === kind) { setEditing(imported); setNotice('Review the imported details, especially province and coordinates, before publishing.'); onImportUsed?.() }
  }, [imported, kind, onImportUsed])
  useEffect(() => { if (editing) formHeading.current?.focus() }, [editing?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (localArtwork) URL.revokeObjectURL(localArtwork) }, [localArtwork])
  const update = (field: string, value: string | number) => setEditing((current) => current ? { ...current, data: { ...current.data, [field]: value } } : current)
  const chooseCity = (value: string) => {
    const found = findCityDirectoryEntry(value)
    setEditing((current) => current ? { ...current, data: { ...current.data, city: value, ...(found ? { region: found.province, latitude: found.latitude, longitude: found.longitude } : {}) } } : current)
  }
  async function upload(file?: File) {
    if (!file) return
    setError('')
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2097152) { setError('Choose a JPEG, PNG or WebP cover smaller than 2 MB.'); return }
    setUploading(true)
    try {
      const bitmap = await createImageBitmap(file)
      if (bitmap.width < 300 || bitmap.height < 300) { bitmap.close(); throw new Error('Choose artwork at least 300 × 300 pixels for the carousel.') }
      bitmap.close()
      if (preview) { setLocalArtwork(URL.createObjectURL(file)); update('image','https://example.com/sample-artwork.jpg'); setNotice('Artwork selected for preview only. Nothing was uploaded.'); return }
      const base64 = await new Promise<string>((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file) })
      const result = await requestJson<{ url: string }>('/api/artist-upload', { method: 'POST', body: JSON.stringify({ base64 }) })
      update('image',result.url); setLocalArtwork(''); setNotice('Artwork uploaded. Publish the release when its details are ready.')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Artwork upload failed.') }
    finally { setUploading(false) }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || busy || uploading) return
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')
    const state = action === 'published' ? 'published' : 'draft'
    const validated = validateContent(kind, editing.data, editing.id)
    if (!validated) { setError('Complete the required fields with valid links, a date and map location. Artwork is required for releases.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      let entry = { ...editing, state, data: validated, updated_at: new Date().toISOString() } as ContentEntry
      if (!preview) entry = (await requestJson<{ entry: ContentEntry }>('/api/artist-content', { method: 'PUT', body: JSON.stringify(entry) })).entry
      setEntries((current) => [entry, ...current.filter((row) => row.id !== entry.id)])
      setEditing(null)
      setNotice(preview ? `Sample ${label} saved locally. The public website is unchanged.` : state === 'published' ? `${kind === 'show' ? 'Show published to the Live map' : 'Release published to the Listen carousel'}. Open the website to see it; open pages refresh within a minute.` : `${label[0].toUpperCase()+label.slice(1)} saved as a private draft. It is not visible on the website.`)
      panel.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Changes were not saved.') }
    finally { setBusy(false) }
  }
  const release = editing?.data as DiscographyRelease | undefined
  const show = editing?.data as LiveEvent | undefined
  return <section className="content-manager" ref={panel} aria-labelledby={`manage-${kind}`}>
    <header className="desk-section-heading"><div><p className="desk-label">Website publishing</p><h2 id={`manage-${kind}`}>{kind === 'show' ? 'Shows on the map' : 'The release archive'}</h2></div><button type="button" className="desk-button" onClick={() => { setEditing(blank(kind)); setError(''); setNotice(''); setLocalArtwork('') }}>+ Add {label}</button></header>
    <p className="desk-footnote">{kind === 'show' ? 'Add a performance anywhere on the South African map. Choose a city or enter exact venue coordinates.' : 'Add a single or album with its cover artwork. Published releases appear first in the animated Listen archive.'} Existing archive entries remain untouched.</p>
    {error && <p className="desk-feedback is-error" role="alert">{error}</p>}{notice && <p className="desk-feedback" role="status">{notice}</p>}
    {editing ? <form className="content-editor" onSubmit={save}>
      <div className="content-editor__heading"><h3 ref={formHeading} tabIndex={-1}>Prepare your {label}.</h3><button type="button" className="desk-text-button" disabled={busy || uploading} onClick={() => setEditing(null)}>Cancel edit</button></div>
      <fieldset disabled={busy || uploading}><legend className="sr-only">{label} details</legend>
      <label className="content-field content-field--wide">{kind === 'show' ? 'Performance title' : 'Release title'}<input required maxLength={200} value={editing.data.title} onChange={(event) => update('title',event.target.value)} placeholder={kind === 'show' ? 'An evening with Internet Athi' : 'The name of the record'} /></label>
      {kind === 'show' && show ? <>
        <label className="content-field">Venue<input required maxLength={200} value={show.venue} onChange={(event) => update('venue',event.target.value)} /></label>
        <label className="content-field">City or town<input required maxLength={100} list="content-city-options" value={show.city} onChange={(event) => chooseCity(event.target.value)} /><datalist id="content-city-options">{southAfricaCityDirectory.map((city) => <option key={city.name} value={city.name} />)}</datalist></label>
        <label className="content-field">Date & time (South Africa, UTC+02)<input type="datetime-local" required value={show.startDateTime.slice(0,16)} onChange={(event) => update('startDateTime',event.target.value ? `${event.target.value}:00+02:00` : '')} /></label>
        <label className="content-field">Province<select required value={show.region || ''} onChange={(event) => update('region',event.target.value)}><option value="">Select province</option>{provinces.map((province) => <option key={province}>{province}</option>)}</select></label>
        <label className="content-field">Latitude<input type="number" step="any" min="-35.5" max="-22" required value={show.latitude || ''} onChange={(event) => update('latitude',event.target.value ? Number(event.target.value) : 0)} /></label>
        <label className="content-field">Longitude<input type="number" step="any" min="16" max="33.5" required value={show.longitude || ''} onChange={(event) => update('longitude',event.target.value ? Number(event.target.value) : 0)} /></label>
        <p className="content-field--wide desk-footnote">City suggestions fill approximate coordinates. For an exact venue pin, replace them with the venue’s latitude and longitude. The current map supports South Africa.</p>
        <label className="content-field content-field--wide">Ticket or RSVP link <span>Optional · HTTPS</span><input type="url" maxLength={2000} value={show.ticketUrl || ''} onChange={(event) => update('ticketUrl',event.target.value)} placeholder="https://…" /></label>
        <label className="content-field content-field--wide">Notes about the show <span>Public description</span><textarea maxLength={3000} rows={3} value={show.description || ''} onChange={(event) => update('description',event.target.value)} /></label>
      </> : release && <>
        <label className="content-field">Release type<select value={release.releaseType} onChange={(event) => update('releaseType',event.target.value)}><option>Single</option><option>Album</option></select></label>
        <label className="content-field">Release year<input type="number" min="1900" max="2100" required value={release.year} onChange={(event) => update('year',Number(event.target.value))} /></label>
        <label className="content-field content-field--wide">Spotify album or track link<input type="url" required maxLength={2000} value={release.spotifyUrl} placeholder="https://open.spotify.com/album/…" onChange={(event) => update('spotifyUrl',event.target.value)} /></label>
        <div className="content-artwork content-field--wide">{(localArtwork || release.image) ? <img src={localArtwork || release.image} alt="Selected cover preview" /> : <div className="content-artwork__empty" aria-hidden="true">♪</div>}<div><label className="content-field">Cover artwork<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])} /></label><p className="desk-footnote">Square artwork recommended. JPEG, PNG or WebP, at least 300 × 300, up to 2 MB. Upload only artwork you have permission to use.</p></div></div>
        <label className="content-field content-field--wide">Or use a hosted artwork URL<input type="url" required maxLength={2000} value={release.image} placeholder="https://…" onChange={(event) => { setLocalArtwork(''); update('image',event.target.value) }} /></label>
        <label className="content-field content-field--wide">Describe the cover <span>For screen readers</span><input required maxLength={300} value={release.alt} onChange={(event) => update('alt',event.target.value)} placeholder="Describe the artwork, not the file name" /></label>
      </>}
      <div className="content-publish-actions content-field--wide"><button className="desk-button" type="submit" value="published">{preview ? 'Preview publishing' : editing.state === 'published' ? 'Update published entry' : 'Publish to website'} ↗</button><button className="desk-text-button" type="submit" value="draft">{editing.state === 'published' ? 'Unpublish to draft' : 'Save as draft'}</button></div>
      </fieldset>{(busy || uploading) && <p className="desk-feedback" role="status">{uploading ? 'Uploading artwork…' : 'Saving…'}</p>}
    </form> : <div className="content-entry-list">
      {entries.filter((entry) => entry.kind === kind).map((entry) => <article key={entry.id}>{kind === 'release' && <img src={(entry.data as DiscographyRelease).image} alt="" />}<div><h3>{entry.data.title}</h3><p>{kind === 'show' ? `${(entry.data as LiveEvent).city} · ${(entry.data as LiveEvent).startDateTime.slice(0,10)}` : `${(entry.data as DiscographyRelease).releaseType} · ${(entry.data as DiscographyRelease).year}`}</p></div><span className={`desk-status ${entry.state === 'published' ? 'desk-status--confirmed' : ''}`}>{entry.state === 'published' ? 'Published' : 'Private draft'}</span><button className="desk-text-button" type="button" onClick={() => { setEditing(entry); setLocalArtwork('') }}>Edit</button></article>)}
      {!entries.some((entry) => entry.kind === kind) && <div className="desk-empty"><p>{loading ? 'Loading your archive…' : `No added ${kind === 'show' ? 'shows' : 'releases'} yet.`}</p><span>{preview ? 'Try adding a sample. No changes will reach the website.' : `Use Add ${label} to prepare your first entry here.`}</span>{error && <button className="desk-text-button" type="button" onClick={() => void load()}>Retry loading</button>}</div>}
    </div>}
  </section>
}
