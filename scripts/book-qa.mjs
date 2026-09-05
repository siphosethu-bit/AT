import { mkdir } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

const baseUrl = process.env.QA_BASE_URL ?? 'http://localhost:4173'
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

await mkdir('.qa', { recursive: true })

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--disable-gpu'],
})

const results = { errors: [], checks: {} }

// Chromium's full-page screenshot resizes the viewport to the document height; if that happens
// while a hover/transform/animation is still settling (e.g. right after a click), fixed-position
// layers can be composited twice. Scrolling to the top, moving the mouse away and giving
// transitions time to finish avoids that screenshot-only artifact.
async function fullPageScreenshot(page, path) {
  await page.mouse.move(0, 0)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  await page.screenshot({ path, fullPage: true })
}

async function withPage(viewport, fn) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  await page.goto(`${baseUrl}/book`, { waitUntil: 'networkidle' })
  await fn(page)
  if (runtimeErrors.length) results.errors.push({ viewport: viewport.name, runtimeErrors })
  await context.close()
}

// Desktop 1440: fill the sentence, check live poster updates, submit, check stamp + success state.
await withPage({ name: 'desktop-1440', width: 1440, height: 1000 }, async (page) => {
  await fullPageScreenshot(page, '.qa/book-1440-empty.png')

  await page.locator('#brief-venue').fill('The Castle of Good Hope')
  await page.locator('#brief-city').fill('Cape Town')
  await page.locator('#brief-date').fill('14 March 2026')
  await page.locator('#brief-format').selectOption('festival set')
  await page.locator('#brief-audience').fill('850')
  await page.locator('#brief-email').fill('promoter@example.com')
  await page.locator('#brief-room').fill('Outdoor courtyard, PA supplied, warm evening light.')
  await page.locator('#brief-who').fill('Zanele Mokoena, Sound & Motion Festival')

  const posterVenue = await page.locator('.booking-poster__venue').innerText()
  const posterCity = await page.locator('.booking-poster__city').innerText()
  const posterDate = await page.locator('.booking-poster__date').innerText()
  results.checks.posterVenue = posterVenue
  results.checks.posterCity = posterCity
  results.checks.posterDate = posterDate

  await fullPageScreenshot(page, '.qa/book-1440-filled.png')

  // Validation: empty required fields should show inline errors.
  await page.locator('#brief-venue').fill('')
  await page.locator('#brief-date').fill('')
  await page.locator('#brief-email').fill('')
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(100)
  const errorTexts = await page.locator('.booking-brief__errors li').allInnerTexts()
  results.checks.validationErrors = errorTexts
  await fullPageScreenshot(page, '.qa/book-1440-errors.png')

  // Refill and submit successfully.
  await page.locator('#brief-venue').fill('The Castle of Good Hope')
  await page.locator('#brief-date').fill('14 March 2026')
  await page.locator('#brief-email').fill('promoter@example.com')
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(300)
  results.checks.stampText = await page.locator('.booking-poster__stamp').innerText()
  results.checks.okText = await page.locator('.booking-brief__ok').innerText()
  await fullPageScreenshot(page, '.qa/book-1440.png')

  const metrics = await page.evaluate(() => ({
    h1Count: document.querySelectorAll('h1').length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    unicodeArrow: document.body.innerText.includes('\u2197'),
  }))
  results.checks.desktopMetrics = metrics

  const axe = await new AxeBuilder({ page }).include('.booking-brief').analyze()
  results.checks.axeViolations = axe.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length }))
})

// Mobile 390: single column layout, form first then poster.
await withPage({ name: 'phone-390', width: 390, height: 844 }, async (page) => {
  const metrics = await page.evaluate(() => {
    const form = document.querySelector('.booking-brief__form')
    const poster = document.querySelector('.booking-brief__poster-wrap')
    const formTop = form.getBoundingClientRect().top
    const posterTop = poster.getBoundingClientRect().top
    return {
      formBeforePoster: formTop < posterTop,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      posterWidth: poster.getBoundingClientRect().width,
    }
  })
  results.checks.mobileMetrics = metrics
  await fullPageScreenshot(page, '.qa/book-390.png')
})

// Keyboard operability: tab into the venue field and submit with Enter from the email field.
await withPage({ name: 'keyboard', width: 1440, height: 1000 }, async (page) => {
  await page.locator('#brief-venue').focus()
  await page.keyboard.type('Kirstenbosch Bandstand')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Cape Town')
  await page.keyboard.press('Tab')
  await page.keyboard.type('20 June 2026')
  const focusedAfterTabs = await page.evaluate(() => document.activeElement?.id)
  results.checks.keyboardFocusReachedDate = focusedAfterTabs === 'brief-date'

  await page.locator('#brief-email').focus()
  await page.keyboard.type('band@example.com')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  results.checks.keyboardSubmit = await page.locator('.booking-brief__ok').innerText()
})

await browser.close()

console.log(JSON.stringify(results, null, 2))
if (results.errors.length) {
  console.error('Console/runtime errors detected')
  process.exitCode = 1
}
