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
  await page.locator('.performance-globe__canvas').waitFor({ state: 'visible' })
  await page.waitForTimeout(100)

  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector('.performance-globe__canvas')
    const bounds = canvas?.getBoundingClientRect()
    const dpr = Number(canvas?.getAttribute('data-dpr') ?? 0)
    return {
      h1Count: document.querySelectorAll('h1').length,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      canvasWidth: bounds?.width ?? 0,
      canvasHeight: bounds?.height ?? 0,
      canvasBackingWidth: canvas instanceof HTMLCanvasElement ? canvas.width : 0,
      dpr,
      filters: document.querySelectorAll('.programme__filters button').length,
      controls: document.querySelectorAll('.performance-globe__controls button').length,
      listedEvents: document.querySelectorAll('.programme-entry').length,
      visibleMarkers: Number(canvas?.getAttribute('data-visible-markers') ?? 0),
    }
  })
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
const canvas = interactionPage.locator('.performance-globe__canvas')
await canvas.scrollIntoViewIfNeeded()
await interactionPage.waitForTimeout(1400)

const rotationBeforePause = await canvas.getAttribute('data-rotation')
await interactionPage.getByRole('button', { name: 'Pause rotation' }).click()
await interactionPage.waitForTimeout(250)
const pausedRotationOne = await canvas.getAttribute('data-rotation')
await interactionPage.waitForTimeout(250)
const pausedRotationTwo = await canvas.getAttribute('data-rotation')
report.interactions.pauseStopsRotation = pausedRotationOne === pausedRotationTwo

await interactionPage.getByRole('button', { name: 'Resume rotation' }).click()
await interactionPage.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
await interactionPage.mouse.move(10, 10)
await interactionPage.waitForTimeout(1200)
const rotationAfterResume = await canvas.getAttribute('data-rotation')
report.interactions.resumeRestartsRotation = rotationBeforePause !== rotationAfterResume

await interactionPage.getByRole('button', { name: 'Past archive' }).click()
report.interactions.pastCount = await interactionPage.locator('.programme-entry').count()
await interactionPage.getByRole('button', { name: 'All' }).click()
report.interactions.allCount = await interactionPage.locator('.programme-entry').count()
await interactionPage.getByRole('button', { name: 'Upcoming', exact: true }).click()
report.interactions.upcomingCount = await interactionPage.locator('.programme-entry').count()

const firstEventButton = interactionPage.locator('.programme-entry__select').first()
const firstEventTitle = await firstEventButton.locator('strong').innerText()
await firstEventButton.click()
await interactionPage.locator('.programme-detail').waitFor({ state: 'visible' })
report.interactions.listSelectionOpensDetails = await interactionPage.getByRole('heading', { name: firstEventTitle }).isVisible()
report.interactions.detailHasCoreActions = await interactionPage.locator('.programme-detail__actions').getByRole('link', { name: /Get tickets/i }).isVisible()
  && await interactionPage.locator('.programme-detail__actions').getByRole('button', { name: /Add to calendar/i }).isVisible()
  && await interactionPage.locator('.programme-detail__actions').getByRole('link', { name: /Directions/i }).isVisible()
report.interactions.selectionPausesRotation = await canvas.getAttribute('data-rotation-state') === 'paused'

await interactionPage.keyboard.press('Escape')
await interactionPage.locator('.programme-detail').waitFor({ state: 'detached' })
report.interactions.escapeReturnsFocus = await firstEventButton.evaluate((element) => document.activeElement === element)
await interactionPage.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
await interactionPage.mouse.move(10, 10)
const rotationAfterClose = await canvas.getAttribute('data-rotation')
await interactionPage.waitForTimeout(1500)
report.interactions.closeResumesRotation = rotationAfterClose !== await canvas.getAttribute('data-rotation')

const marker = interactionPage.locator('.performance-globe__marker-hit[data-visible="true"]').first()
await marker.focus()
await interactionPage.waitForTimeout(120)
await marker.click()
await interactionPage.locator('.programme-detail').waitFor({ state: 'visible' })
report.interactions.markerSelectionOpensDetails = true
await interactionPage.getByRole('button', { name: 'Close event details' }).click()

await canvas.scrollIntoViewIfNeeded()
const bounds = await canvas.boundingBox()
if (bounds) {
  await interactionPage.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.45)
  const dragStart = await canvas.getAttribute('data-rotation')
  await interactionPage.mouse.down()
  await interactionPage.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.45, { steps: 6 })
  await interactionPage.mouse.up()
  report.interactions.horizontalDragRotates = dragStart !== await canvas.getAttribute('data-rotation')

  await interactionPage.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.45)
  const scrollStart = await interactionPage.evaluate(() => window.scrollY)
  await interactionPage.mouse.wheel(0, 500)
  await interactionPage.waitForTimeout(120)
  report.interactions.globeDoesNotTrapVerticalScroll = await interactionPage.evaluate(() => window.scrollY) > scrollStart
}

await interactionContext.close()

const reducedContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
})
const reducedPage = await reducedContext.newPage()
await reducedPage.goto(`${baseUrl}/live`, { waitUntil: 'networkidle' })
const reducedCanvas = reducedPage.locator('.performance-globe__canvas')
await reducedCanvas.scrollIntoViewIfNeeded()
await reducedPage.waitForTimeout(120)
const reducedRotationOne = await reducedCanvas.getAttribute('data-rotation')
await reducedPage.waitForTimeout(500)
const reducedRotationTwo = await reducedCanvas.getAttribute('data-rotation')
report.interactions.reducedMotionStopsAutoRotation = reducedRotationOne === reducedRotationTwo
await reducedContext.close()

await browser.close()

const failures = []
for (const page of report.pages) {
  const { metrics } = page
  if (
    metrics.h1Count !== 1
    || metrics.horizontalOverflow
    || metrics.canvasWidth <= 0
    || metrics.canvasHeight <= 0
    || metrics.canvasBackingWidth > metrics.canvasWidth * 2 + 2
    || metrics.dpr <= 0
    || metrics.dpr > 2
    || metrics.filters !== 3
    || metrics.controls !== 4
    || metrics.listedEvents !== 2
    || metrics.visibleMarkers < 1
    || page.seriousViolations.length
    || page.runtimeErrors.length
  ) failures.push(page)
}

for (const [name, value] of Object.entries(report.interactions)) {
  const expectedCounts = { upcomingCount: 2, pastCount: 4, allCount: 6 }
  if (name in expectedCounts ? value !== expectedCounts[name] : value !== true) {
    failures.push({ interaction: name, value })
  }
}

await writeFile('.qa/live-report.json', JSON.stringify({ ...report, failures }, null, 2))
console.log(JSON.stringify({ pageChecks: report.pages.length, interactions: report.interactions, failures }, null, 2))

if (failures.length) process.exitCode = 1
