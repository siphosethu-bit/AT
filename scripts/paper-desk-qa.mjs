import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const base = process.env.QA_BASE_URL || 'http://localhost:5173'
await mkdir('.qa/paper-desk', { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const report = { pages: [], interactions: [], errors: [] }
try {
  for (const viewport of [{ width: 1672, height: 941 }, { width: 390, height: 844 }, { width: 320, height: 700 }, { width: 1024, height: 768 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
    const page = await context.newPage()
    page.on('pageerror', (error) => report.errors.push(error.message))
    // External media is independently hosted; audit our own interface deterministically.
    await page.route('**/youtube-nocookie.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<html lang="en"><title>Interview fixture</title></html>' }))
    for (const path of ['/', '/listen', '/live', '/story', '/book', '/admin', '/admin/preview']) {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      const metrics = await page.evaluate(() => ({
        width: innerWidth, documentWidth: document.documentElement.scrollWidth,
        header: document.querySelector('.paper-header')?.getBoundingClientRect().toJSON(),
        nav: document.querySelector('.desktop-nav')?.getBoundingClientRect().toJSON(),
        background: getComputedStyle(document.body).backgroundColor,
      }))
      const audit = await new AxeBuilder({ page }).exclude('iframe').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
      const violations = audit.violations.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) }))
      const name = path.replaceAll('/', '-') || '-home'
      if (viewport.width === 1672 || viewport.width === 390) await page.screenshot({ path: `.qa/paper-desk/${viewport.width}${name}.png`, fullPage: path === '/' || path.includes('admin') || path === '/book' })
      report.pages.push({ viewport, path, metrics, violations })
    }
    // Stable navigation is measured across actual client-side transitions too.
    if (viewport.width > 760) {
      await page.goto(base)
      const positions = []
      for (const label of ['Listen', 'Live', 'Story', 'Book']) {
        await page.locator('.desktop-nav').getByRole('link', { name: label, exact: true }).click()
        positions.push(await page.locator('.desktop-nav').boundingBox())
      }
      assert(positions.every((rect) => Math.abs(rect.x - positions[0].x) < 1 && Math.abs(rect.y - positions[0].y) < 1), 'Navigation shifted between routes')
    } else {
      await page.goto(base)
      await page.getByRole('button', { name: 'Menu' }).click()
      await page.getByRole('dialog').getByRole('link', { name: /Story/ }).click()
      await page.waitForURL('**/story')
      await page.waitForTimeout(400)
      assert.equal(await page.locator('#main-content').getAttribute('inert'), null)
    }
    await context.close()
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  await page.goto(`${base}/admin/preview`)
  await page.getByRole('button', { name: /The Listening Room/ }).click()
  await page.getByLabel('Where things stand').selectOption('reviewing')
  await page.getByLabel(/Private notes/).fill('QA sample note')
  await page.getByRole('button', { name: 'Update sample' }).click()
  await page.getByText('Sample updated for this preview only.').waitFor()
  await page.keyboard.press('Escape')
  await page.locator('.desk-navigation').getByRole('button', { name: /Enquiries/ }).click()
  await page.getByRole('searchbox').fill('Listening')
  assert.equal(await page.locator('.desk-table-row').count(), 1)
  await page.locator('.desk-table-row').click()
  assert.equal(await page.getByLabel(/Private notes/).inputValue(), 'QA sample note')
  await page.screenshot({ path: '.qa/paper-desk/enquiry-detail.png' })
  await page.keyboard.press('Escape')
  await page.locator('.desk-navigation').getByRole('button', { name: /Live & shows/ }).click()
  await page.getByText('Awaiting connection', { exact: true }).waitFor()
  await page.screenshot({ path: '.qa/paper-desk/shows.png', fullPage: true })
  report.interactions.push('Preview: edit enquiry, persist in memory, filter, modal Escape, show connection state')

  // Verify public form tells the truth on failed and successful server responses.
  await page.goto(`${base}/book`)
  await page.getByRole('button', { name: 'Send the brief' }).click()
  assert.equal(await page.locator('#brief-venue').evaluate((node) => node === document.activeElement), true)
  await page.getByRole('textbox', { name: 'Venue', exact: true }).fill('QA venue')
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('Cape Town')
  await page.getByRole('textbox', { name: 'Proposed date' }).fill('24 October 2026')
  await page.getByRole('textbox', { name: 'Your email' }).fill('test@example.com')
  await page.getByLabel("Who's asking").fill('QA organiser')
  await page.getByRole('checkbox').check()
  await page.route('**/api/booking', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Test server unavailable.' }) }))
  await page.getByRole('button', { name: 'Send the brief' }).click()
  await page.getByText('Test server unavailable.').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Send the brief' }).isEnabled(), true)
  await page.unroute('**/api/booking')
  await page.route('**/api/booking', (route) => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ reference: 'QA-SAVED-001' }) }))
  await page.getByRole('button', { name: 'Send the brief' }).click()
  await page.getByText('QA-SAVED-001', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Enquiry received' }).isDisabled(), true)
  report.interactions.push('Booking: validation focus, API failure + email fallback, saved receipt only after API success')
  await context.close()
} finally {
  await writeFile('.qa/paper-desk/report.json', JSON.stringify(report, null, 2))
  await browser.close()
}
const overflow = report.pages.filter((entry) => entry.metrics.documentWidth > entry.metrics.width)
const violations = report.pages.filter((entry) => entry.violations.length)
console.log(JSON.stringify({ pages: report.pages.length, interactions: report.interactions, overflow, violations, errors: report.errors }, null, 2))
if (overflow.length || violations.length || report.errors.length) process.exitCode = 1
