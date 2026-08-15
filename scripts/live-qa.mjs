import { mkdir, writeFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173'
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const viewports = [
  { name: 'phone-320', width: 320, height: 780 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'phone-412', width: 412, height: 915 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 1000 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'landscape-phone', width: 844, height: 390 },
  { name: 'landscape-tablet', width: 1024, height: 600 },
]

await mkdir('.qa', { recursive: true })

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--disable-gpu'],
})

const report = { pages: [], interactions: {}, errors: [] }

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })

  await page.goto(`${baseUrl}/live`, { waitUntil: 'networkidle' })
  await page.locator('.live-map').waitFor({ state: 'visible' })
  await page.locator('.live-map').scrollIntoViewIfNeeded()
  await page.locator('.live-map[data-reveal-state="revealed"]').waitFor({ state: 'attached', timeout: 3000 })
  await page.waitForTimeout(150)

  const metrics = await page.evaluate(() => ({
    h1Count: document.querySelectorAll('h1').length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    filters: document.querySelectorAll('.programme__filters button').length,
    listedEvents: document.querySelectorAll('.programme-entry').length,
    mapMarkers: document.querySelectorAll('.live-map__marker').length,
    cityLabels: document.querySelectorAll('.live-map__city-label').length,
  }))
  const axe = await new AxeBuilder({ page }).analyze()
  const seriousViolations = axe.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({ id: violation.id, nodes: violation.nodes.length }))

  if (viewport.name === 'phone-390' || viewport.name === 'desktop-1440') {
    await page.screenshot({ path: `.qa/live-${viewport.name}.png`, fullPage: true })
  }

  report.pages.push({ viewport, metrics, seriousViolations, runtimeErrors })
  await context.close()
}

const interactionContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const interactionPage = await interactionContext.newPage()
await interactionPage.goto(`${baseUrl}/live`, { waitUntil: 'networkidle' })
const map = interactionPage.locator('.live-map')
await map.scrollIntoViewIfNeeded()
await interactionPage.locator('.live-map[data-reveal-state="revealed"]').waitFor({ state: 'attached', timeout: 3000 })
await interactionPage.waitForTimeout(400)

report.interactions.cityLabelCount = await interactionPage.locator('.live-map__city-label').count()
report.interactions.upcomingListedCount = await interactionPage.locator('.programme-entry').count()
report.interactions.upcomingMarkerCount = await interactionPage.locator('.live-map__marker').count()

const firstMarker = interactionPage.locator('.live-map__marker').first()
const firstListRow = interactionPage.locator('.programme-entry__select').first()
await firstListRow.hover()
await interactionPage.waitForTimeout(100)
report.interactions.listHoverHighlightsMarker = (await firstMarker.getAttribute('class') ?? '').includes('is-highlighted')
await interactionPage.mouse.move(10, 10)

await interactionPage.getByRole('button', { name: 'Past archive' }).click()
report.interactions.pastListedCount = await interactionPage.locator('.programme-entry').count()
report.interactions.pastMarkerCount = await interactionPage.locator('.live-map__marker').count()

await interactionPage.getByRole('button', { name: 'All' }).click()
report.interactions.allListedCount = await interactionPage.locator('.programme-entry').count()
report.interactions.allMarkerCount = await interactionPage.locator('.live-map__marker').count()
report.interactions.hasGroupedMarker = await interactionPage.locator('.live-map__marker-count').count() === 1

await interactionPage.getByRole('button', { name: 'Upcoming', exact: true }).click()

const firstEventButton = interactionPage.locator('.programme-entry__select').first()
const firstEventTitle = await firstEventButton.locator('strong').innerText()
await firstEventButton.click()
await interactionPage.locator('.programme-detail').waitFor({ state: 'visible' })
report.interactions.listSelectionOpensDetails = await interactionPage.getByRole('heading', { name: firstEventTitle }).isVisible()
report.interactions.detailHasCoreActions = await interactionPage.locator('.programme-detail__actions').getByRole('link', { name: /Get tickets/i }).isVisible()
  && await interactionPage.locator('.programme-detail__actions').getByRole('button', { name: /Add to calendar/i }).isVisible()
  && await interactionPage.locator('.programme-detail__actions').getByRole('link', { name: /Directions/i }).isVisible()

await interactionPage.keyboard.press('Escape')
await interactionPage.locator('.programme-detail').waitFor({ state: 'detached' })
report.interactions.escapeReturnsFocus = await firstEventButton.evaluate((element) => document.activeElement === element)

await interactionPage.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
const markerButton = interactionPage.locator('.live-map__marker').first()
await markerButton.focus()
await interactionPage.waitForTimeout(120)
await markerButton.click()
await interactionPage.locator('.programme-detail').waitFor({ state: 'visible' })
report.interactions.markerSelectionOpensDetails = true
await interactionPage.getByRole('button', { name: 'Close event details' }).click()

await map.scrollIntoViewIfNeeded()
const bounds = await map.boundingBox()
if (bounds) {
  await interactionPage.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.45)
  const scrollStart = await interactionPage.evaluate(() => window.scrollY)
  await interactionPage.mouse.wheel(0, 500)
  await interactionPage.waitForTimeout(120)
  report.interactions.mapDoesNotTrapVerticalScroll = await interactionPage.evaluate(() => window.scrollY) > scrollStart
}

await interactionContext.close()

const reducedContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
})
const reducedPage = await reducedContext.newPage()
await reducedPage.goto(`${baseUrl}/live`, { waitUntil: 'networkidle' })
const reducedMap = reducedPage.locator('.live-map')
await reducedMap.scrollIntoViewIfNeeded()
await reducedPage.locator('.live-map[data-reveal-state="revealed"]').waitFor({ state: 'attached', timeout: 3000 })
report.interactions.reducedMotionMarkersVisible = await reducedPage.locator('.live-map__marker').first().isVisible()
const reducedFirstMarker = reducedPage.locator('.live-map__marker').first()
await reducedFirstMarker.click()
report.interactions.reducedMotionMarkerClickable = await reducedPage.locator('.programme-detail').isVisible()
await reducedContext.close()

await browser.close()

const failures = []
for (const page of report.pages) {
  const { metrics } = page
  if (
    metrics.h1Count !== 1
    || metrics.horizontalOverflow
    || metrics.filters !== 3
    || metrics.listedEvents !== 2
    || metrics.mapMarkers !== 2
    || metrics.cityLabels !== 12
    || page.seriousViolations.length
    || page.runtimeErrors.length
  ) failures.push(page)
}

const expectedCounts = {
  cityLabelCount: 12,
  upcomingListedCount: 2,
  upcomingMarkerCount: 2,
  pastListedCount: 4,
  pastMarkerCount: 4,
  allListedCount: 6,
  allMarkerCount: 5,
}
for (const [name, value] of Object.entries(report.interactions)) {
  const expected = name in expectedCounts ? expectedCounts[name] : true
  if (value !== expected) failures.push({ interaction: name, value, expected })
}

await writeFile('.qa/live-report.json', JSON.stringify({ ...report, failures }, null, 2))
console.log(JSON.stringify({ pageChecks: report.pages.length, interactions: report.interactions, failures }, null, 2))

if (failures.length) process.exitCode = 1
