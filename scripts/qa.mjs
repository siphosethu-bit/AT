import { mkdir, writeFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173'
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const routes = ['/', '/listen', '/live', '/story', '/book']
const viewports = [
  { width: 320, height: 780 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
  { width: 1440, height: 1000 },
  { width: 1920, height: 1080 },
]

await mkdir('.qa', { recursive: true })

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--disable-gpu'],
})

const report = {
  pages: [],
  interactions: {},
  errors: [],
}

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
  await context.addInitScript(() => sessionStorage.setItem('internet-athi-intro-seen', 'true'))

  for (const route of routes) {
    const page = await context.newPage()
    const pageErrors = []
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`)
    })
    page.on('pageerror', (error) => pageErrors.push(`page: ${error.message}`))

    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })

    const metrics = await page.evaluate(() => {
      const offenders = [...document.querySelectorAll('*')]
        .filter((element) => element.scrollWidth > element.clientWidth + 2)
        .map((element) => ({
          tag: element.tagName,
          className: typeof element.className === 'string' ? element.className : '',
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        }))
        .filter((item) => !item.className.includes('track-index__title'))
        .slice(0, 10)

      return {
        title: document.title,
        h1Count: document.querySelectorAll('h1').length,
        mainCount: document.querySelectorAll('main').length,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        offenders,
      }
    })

    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    const seriousViolations = axeResults.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))

    const slug = route === '/' ? 'home' : route.slice(1)
    if ([390, 1440].includes(viewport.width)) {
      await page.screenshot({
        path: `.qa/${slug}-${viewport.width}.png`,
        fullPage: route !== '/',
      })
    }

    report.pages.push({
      route,
      viewport: viewport.width,
      ...metrics,
      seriousAxeViolations: seriousViolations.map((item) => ({
        id: item.id,
        impact: item.impact,
        help: item.help,
        nodes: item.nodes.length,
      })),
      errors: pageErrors,
    })

    pageErrors.forEach((error) => report.errors.push({ route, viewport: viewport.width, error }))
    await page.close()
  }

  await context.close()
}

const interactionContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
await interactionContext.addInitScript(() => sessionStorage.setItem('internet-athi-intro-seen', 'true'))
const interactionPage = await interactionContext.newPage()

await interactionPage.goto(baseUrl, { waitUntil: 'networkidle' })
await interactionPage.getByRole('link', { name: 'Listen', exact: true }).click()
const listenPath = new URL(interactionPage.url()).pathname
await interactionPage.goBack()
const backPath = new URL(interactionPage.url()).pathname

await interactionPage.goto(`${baseUrl}/listen`, { waitUntil: 'networkidle' })
const spotifyFramesBefore = await interactionPage.locator('iframe[title*="Spotify"]').count()
await interactionPage.getByRole('button', { name: 'Watch Nguwe' }).click()
const videoFrameVisible = await interactionPage.locator('iframe[title*="Nguwe"]').isVisible()
await interactionPage.keyboard.press('Escape')
const modalClosed = await interactionPage.locator('[role="dialog"]').count() === 0

await interactionPage.goto(`${baseUrl}/live`, { waitUntil: 'networkidle' })
const upcomingCount = await interactionPage.locator('.programme-entry').count()
await interactionPage.getByRole('button', { name: 'Past archive' }).click()
const pastCount = await interactionPage.locator('.programme-entry').count()

await interactionPage.goto(`${baseUrl}/book`, { waitUntil: 'networkidle' })
const controls = interactionPage.locator('form input:not([name="website"]), form select, form textarea')
const formControlCount = await controls.count()
let labelledControlCount = 0
for (let index = 0; index < formControlCount; index += 1) {
  const id = await controls.nth(index).getAttribute('id')
  if (id && await interactionPage.locator(`label[for="${id}"]`).count()) labelledControlCount += 1
}

report.interactions = {
  routeNavigation: listenPath === '/listen',
  browserBack: backPath === '/',
  spotifyDeferred: spotifyFramesBefore === 0,
  videoFrameVisible,
  videoEscapeCloses: modalClosed,
  upcomingCount,
  pastCount,
  formControlCount,
  labelledControlCount,
}

await interactionContext.close()
await browser.close()

await writeFile('.qa/report.json', JSON.stringify(report, null, 2))

const failures = report.pages.filter((page) =>
  page.horizontalOverflow ||
  page.h1Count !== 1 ||
  page.mainCount !== 1 ||
  page.seriousAxeViolations.length > 0 ||
  page.errors.length > 0,
)

console.log(JSON.stringify({
  pageChecks: report.pages.length,
  failures,
  interactions: report.interactions,
  runtimeErrors: report.errors,
}, null, 2))

if (failures.length || report.errors.length || Object.values(report.interactions).some((value) => value === false)) {
  process.exitCode = 1
}
