import { mkdir } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

const baseUrl = process.env.QA_BASE_URL ?? 'http://localhost:4175'
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

await mkdir('.qa', { recursive: true })

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--disable-gpu'],
})

const results = { errors: [], checks: {} }

async function withPage({ width, height, reducedMotion }, fn) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, acceptDownloads: true })
  const page = await context.newPage()
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  await page.goto(`${baseUrl}/live`, { waitUntil: 'networkidle' })
  await page.locator('.live-map[data-reveal-state="revealed"]').waitFor({ state: 'attached', timeout: 4000 })
  await fn(page, context)
  if (runtimeErrors.length) results.errors.push({ viewport: viewport.name, runtimeErrors })
  await context.close()
}

async function fullPageScreenshot(page, path) {
  await page.mouse.move(0, 0)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: true })
}

await withPage({ name: 'desktop-1440', width: 1440, height: 1000 }, async (page) => {
  await fullPageScreenshot(page, '.qa/live-1440-empty.png')

  const pageMetrics = await page.evaluate(() => ({
    removedSelectors: [
      '.programme__directory-head',
      '.programme-detail',
      '.programme-list',
      '.city-request-cta',
      '.programme__map-key',
      '.programme__request',
    ].filter((selector) => document.querySelector(selector) !== null),
    h1Count: document.querySelectorAll('h1').length,
    h1Text: document.querySelector('h1')?.textContent,
    ledeText: document.querySelector('.live-desk__header p')?.textContent,
    unicodeArrow: document.body.innerText.includes('\u2197') || document.body.innerText.includes('\u203a') || document.body.innerText.includes('\u2039'),
    markerCount: document.querySelectorAll('.live-map__marker:not(.is-demand)').length,
  }))
  results.checks.pageMetrics = pageMetrics

  // Open a marker's card.
  const firstMarker = page.locator('.live-map__marker:not(.is-demand)').first()
  await firstMarker.click()
  await page.locator('.live-map__card.is-visible').waitFor({ timeout: 2000 })

  const cardBox = await page.locator('.live-map__card').boundingBox()
  const mapBox = await page.locator('.live-map').boundingBox()
  results.checks.cardWithinMapBounds = cardBox && mapBox
    ? cardBox.x >= mapBox.x - 1 && cardBox.y >= mapBox.y - 1
      && (cardBox.x + cardBox.width) <= (mapBox.x + mapBox.width + 1)
      && (cardBox.y + cardBox.height) <= (mapBox.y + mapBox.height + 1)
    : false

  results.checks.cardRole = await page.locator('.live-map__card').getAttribute('role')
  results.checks.cardTitle = await page.locator('.live-map__card-title').innerText()
  results.checks.cardWhen = await page.locator('.live-map__card-when').innerText()

  // Hop to next event and check title changes (only meaningful if more than one visible event).
  const visibleCount = await page.evaluate(() => document.querySelectorAll('.live-map__marker:not(.is-demand)').length)
  results.checks.visibleEventCount = visibleCount
  if (visibleCount > 1) {
    const titleBefore = await page.locator('.live-map__card-title').innerText()
    await page.locator('.live-map__card-hop button').last().click()
    await page.waitForTimeout(100)
    const titleAfter = await page.locator('.live-map__card-title').innerText()
    results.checks.hopChangedTitle = titleBefore !== titleAfter
  }

  // Calendar download.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.live-map__card-cal').click(),
  ])
  const icsPath = await download.path()
  const fs = await import('node:fs/promises')
  const icsContent = icsPath ? await fs.readFile(icsPath, 'utf8') : ''
  results.checks.icsSuggestedName = download.suggestedFilename()
  results.checks.icsHasSummary = icsContent.includes('SUMMARY:Internet Athi at')
  results.checks.icsHasLocation = /LOCATION:.+, .+, South Africa/.test(icsContent)
  results.checks.icsHasDtstart = icsContent.includes('DTSTART:')

  // Escape closes and returns focus to the pin.
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  results.checks.closedViaEscape = await page.locator('.live-map__card').count() === 0
  results.checks.focusReturnedToMarker = await page.evaluate(() => document.activeElement?.classList.contains('live-map__marker'))

  // Reopen, then close via outside click.
  await firstMarker.click()
  await page.locator('.live-map__card.is-visible').waitFor({ timeout: 2000 })
  await page.locator('.live-map').click({ position: { x: 5, y: 5 } })
  await page.waitForTimeout(300)
  results.checks.closedViaOutsideClick = await page.locator('.live-map__card').count() === 0

  // Filters: switch to Past, counts should update and pins should change.
  const upcomingBefore = await page.evaluate(() => document.querySelectorAll('.live-map__marker.is-upcoming').length)
  await page.locator('.live-desk__filters button', { hasText: 'Past' }).click()
  await page.waitForTimeout(100)
  const pastAfter = await page.evaluate(() => document.querySelectorAll('.live-map__marker.is-past').length)
  const upcomingAfterPastFilter = await page.evaluate(() => document.querySelectorAll('.live-map__marker.is-upcoming').length)
  results.checks.filters = { upcomingBefore, pastAfter, upcomingAfterPastFilter }

  await fullPageScreenshot(page, '.qa/live-1440-past-filter.png')

  // Re-select Upcoming and open a card, then switch to Past to confirm auto-close.
  await page.locator('.live-desk__filters button', { hasText: 'Upcoming' }).click()
  await page.waitForTimeout(100)
  const anyUpcoming = await page.locator('.live-map__marker.is-upcoming').count()
  if (anyUpcoming > 0) {
    await page.locator('.live-map__marker.is-upcoming').first().click()
    await page.locator('.live-map__card.is-visible').waitFor({ timeout: 2000 })
    await page.locator('.live-desk__filters button', { hasText: 'Past' }).click()
    await page.waitForTimeout(100)
    results.checks.cardClosesOnFilterChange = await page.locator('.live-map__card').count() === 0
  } else {
    results.checks.cardClosesOnFilterChange = 'no-upcoming-events-to-test'
  }

  await page.locator('.live-desk__filters button', { hasText: 'All' }).click()
  await page.waitForTimeout(150)
  await fullPageScreenshot(page, '.qa/live-1440.png')

  const axe = await new AxeBuilder({ page }).analyze()
  results.checks.axeViolations = axe.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length }))

  results.checks.horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  ))
})

// Keyboard-only pass: tab to a marker, open with Enter, arrow-hop, escape.
await withPage({ name: 'keyboard', width: 1440, height: 1000 }, async (page) => {
  await page.locator('.live-desk__filters button', { hasText: 'All' }).click()
  await page.waitForTimeout(100)
  const marker = page.locator('.live-map__marker:not(.is-demand)').first()
  await marker.focus()
  await page.keyboard.press('Enter')
  await page.locator('.live-map__card.is-visible').waitFor({ timeout: 2000 })
  const before = await page.locator('.live-map__card-title').innerText()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(100)
  const after = await page.locator('.live-map__card-title').innerText()
  results.checks.keyboard = {
    opensWithEnter: true,
    arrowHopChangedTitle: before !== after || (await page.locator('.live-map__marker:not(.is-demand)').count()) < 2,
  }
  await page.keyboard.press('Escape')
})

// Mobile bottom sheet.
await withPage({ name: 'phone-390', width: 390, height: 844 }, async (page) => {
  await page.locator('.live-desk__filters button', { hasText: 'All' }).click()
  await page.waitForTimeout(100)
  await fullPageScreenshot(page, '.qa/live-390-empty.png')

  const marker = page.locator('.live-map__marker:not(.is-demand)').first()
  const labelVisibleBefore = await marker.locator('.live-map__marker-label').isVisible()
  await marker.click()
  await page.locator('.live-map__card.is-visible').waitFor({ timeout: 2000 })
  const labelVisibleAfter = await marker.locator('.live-map__marker-label').isVisible()

  const cardBox = await page.locator('.live-map__card').boundingBox()
  const viewport = page.viewportSize()
  results.checks.mobile = {
    labelHiddenByDefault: !labelVisibleBefore,
    labelVisibleWhenOpen: labelVisibleAfter,
    cardIsBottomSheet: !!cardBox && !!viewport && Math.abs((cardBox.y + cardBox.height) - viewport.height) < 40,
  }
  await fullPageScreenshot(page, '.qa/live-390.png')

  const horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  ))
  results.checks.mobile.horizontalOverflow = horizontalOverflow
})

// Reduced motion.
await withPage({ name: 'reduced-motion', width: 1440, height: 1000, reducedMotion: 'reduce' }, async (page) => {
  const ringAnimation = await page.evaluate(() => {
    const ring = document.querySelector('.live-map__marker.is-upcoming .live-map__marker-ring')
    if (!ring) return null
    return getComputedStyle(ring).animationName
  })
  results.checks.reducedMotionRingAnimationNone = ringAnimation === 'none' || ringAnimation === null
})

await browser.close()

console.log(JSON.stringify(results, null, 2))
if (results.errors.length) {
  console.error('Console/runtime errors detected')
  process.exitCode = 1
}
