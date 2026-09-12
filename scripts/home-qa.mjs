import { mkdir, writeFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173'
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 430, height: 932 },
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1680, height: 1050 },
  { width: 1920, height: 1080 },
]

const expectsMenu = ({ width, height }) => (
  width <= 780 ||
  (width <= 900 && height <= 500 && width > height)
)

await mkdir('.qa/home', { recursive: true })

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--disable-gpu'],
})
const report = {
  viewports: [],
  reducedMotion: [],
  interactions: {},
  textEnlargement: {},
  failures: [],
}

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, hasTouch: expectsMenu(viewport) })
  const page = await context.newPage()
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2800)

  const metrics = await page.evaluate((menuExpected) => {
    const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect().toJSON() ?? null
    const visible = (selector) => {
      const element = document.querySelector(selector)
      if (!element) return false
      const style = getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && bounds.width > 0 && bounds.height > 0
    }
    const inViewport = (bounds) => Boolean(
      bounds && bounds.left >= -1 && bounds.right <= innerWidth + 1 && bounds.top >= -1 && bounds.bottom <= innerHeight + 1
    )
    const overlaps = (a, b) => Boolean(
      a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
    )
    const portrait = document.querySelector('.signature-portrait img')
    const stage = rect('.signature-stage')
    const portraitBounds = rect('.signature-portrait')
    const script = rect('.signature-name__script')
    const prefix = rect('.signature-name__prefix')
    const tagline = rect('.signature-stage__tagline')
    const actions = rect('.signature-actions')
    const location = rect('.signature-stage__location')
    const header = rect('.site-header')
    const actionLinks = [...document.querySelectorAll('.signature-actions a')]
    const routeLinks = [...document.querySelectorAll('.desktop-nav a')]

    return {
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      stage,
      afterwordTop: rect('.home-afterword')?.top ?? 0,
      portraitInViewport: inViewport(portraitBounds),
      scriptInViewport: inViewport(script),
      prefixInViewport: inViewport(prefix),
      taglineInViewport: inViewport(tagline),
      actionsInViewport: inViewport(actions),
      locationInViewport: inViewport(location),
      actionsClearOfPortrait: !overlaps(actions, portraitBounds),
      actionsClearOfScript: !overlaps(actions, script),
      actionsClearOfLocation: !overlaps(actions, location),
      taglineClearOfPortrait: !overlaps(tagline, portraitBounds),
      portraitClearOfHeader: Boolean(portraitBounds && header && portraitBounds.top >= header.bottom - 1),
      headingCount: document.querySelectorAll('h1').length,
      portraitLoaded: Boolean(portrait?.complete && portrait.naturalWidth > 0 && portrait.naturalHeight > 0),
      portraitSource: portrait?.currentSrc.split('/').at(-1),
      threadVisible: visible('.signature-thread--upper') && visible('.signature-thread--lower') && visible('.signature-thread__dot'),
      menuModeCorrect: menuExpected
        ? visible('.menu-toggle') && !visible('.desktop-nav')
        : !visible('.menu-toggle') && visible('.desktop-nav'),
      actionLinks: actionLinks.map((link) => ({
        label: link.textContent?.trim(),
        href: link.getAttribute('href'),
        target: link.getAttribute('target'),
        rel: link.getAttribute('rel'),
        width: link.getBoundingClientRect().width,
        height: link.getBoundingClientRect().height,
      })),
      routeLinks: routeLinks.map((link) => link.getAttribute('href')),
    }
  }, expectsMenu(viewport))

  const headingAccessible = await page.getByRole('heading', { level: 1, name: 'internet athi' }).count() === 1
  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const seriousAxeViolations = axeResults.violations
    .filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))
    .map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length }))

  await page.screenshot({
    path: `.qa/home/${viewport.width}x${viewport.height}.png`,
    fullPage: false,
  })

  const actionsCorrect = (
    metrics.actionLinks.length === 2 &&
    metrics.actionLinks[0].href === 'https://open.spotify.com/album/2pduDMmEcftxkrJNIgZYS3' &&
    metrics.actionLinks[1].href === 'https://www.youtube.com/watch?v=te8yGYWmy2I' &&
    metrics.actionLinks.every((link) => (
      link.target === '_blank' &&
      link.rel?.includes('noopener') &&
      link.width >= 43.5 &&
      link.height >= 43.5
    ))
  )
  const result = {
    viewport,
    ...metrics,
    headingAccessible,
    seriousAxeViolations,
    errors,
  }
  report.viewports.push(result)

  if (
    metrics.horizontalOverflow ||
    (metrics.stage?.height ?? 0) < viewport.height - 1 ||
    metrics.afterwordTop < viewport.height - 1 ||
    !metrics.portraitInViewport ||
    !metrics.scriptInViewport ||
    !metrics.prefixInViewport ||
    !metrics.taglineInViewport ||
    !metrics.actionsInViewport ||
    !metrics.locationInViewport ||
    !metrics.actionsClearOfPortrait ||
    !metrics.actionsClearOfScript ||
    !metrics.actionsClearOfLocation ||
    !metrics.taglineClearOfPortrait ||
    !metrics.portraitClearOfHeader ||
    metrics.headingCount !== 1 ||
    !headingAccessible ||
    !metrics.portraitLoaded ||
    metrics.portraitSource !== 'nguwe-cover.jpg' ||
    !metrics.threadVisible ||
    !metrics.menuModeCorrect ||
    !actionsCorrect ||
    JSON.stringify(metrics.routeLinks) !== JSON.stringify(['/listen', '/live', '/story', '/book']) ||
    seriousAxeViolations.length > 0 ||
    errors.length > 0
  ) {
    report.failures.push({ viewport, result })
  }

  await context.close()
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  const context = await browser.newContext({
    viewport,
    hasTouch: expectsMenu(viewport),
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const result = await page.evaluate(() => {
    const animationOf = (selector) => getComputedStyle(document.querySelector(selector)).animationName
    return {
      portraitAnimation: animationOf('.signature-portrait'),
      scriptAnimation: animationOf('.signature-name__script'),
      threadAnimation: animationOf('.signature-thread--upper'),
      dotAnimation: animationOf('.signature-thread__dot'),
      portraitOpacity: getComputedStyle(document.querySelector('.signature-portrait')).opacity,
      threadClip: getComputedStyle(document.querySelector('.signature-thread--upper')).clipPath,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
    }
  })
  report.reducedMotion.push({ viewport, ...result })
  if (
    result.portraitAnimation !== 'none' ||
    result.scriptAnimation !== 'none' ||
    result.threadAnimation !== 'none' ||
    result.dotAnimation !== 'none' ||
    result.portraitOpacity !== '1' ||
    result.threadClip !== 'none' ||
    result.horizontalOverflow
  ) {
    report.failures.push({ viewport, reducedMotion: result })
  }
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const menuButton = page.getByRole('button', { name: 'Menu', exact: true })
  await menuButton.click()
  const menuOpened = await page.getByRole('dialog', { name: 'Primary navigation' }).isVisible()
  const scrollLocked = await page.evaluate(() => getComputedStyle(document.body).overflow === 'hidden')
  await page.keyboard.press('Shift+Tab')
  const reverseTrapWorked = await page.getByRole('link', { name: 'Return home' }).evaluate((link) => document.activeElement === link)
  await page.keyboard.press('Tab')
  const forwardTrapWorked = await page.getByRole('button', { name: 'Close', exact: true }).evaluate((button) => document.activeElement === button)
  await page.keyboard.press('Escape')
  const menuClosedWithEscape = await page.getByRole('dialog', { name: 'Primary navigation' }).count() === 0
  const focusReturned = await menuButton.evaluate((button) => document.activeElement === button)
  await menuButton.click()
  await page.locator('.mobile-menu').getByRole('link', { name: /Listen/ }).click()
  await page.getByRole('dialog', { name: 'Primary navigation' }).waitFor({ state: 'detached', timeout: 2000 }).catch(() => {})
  const routeChanged = new URL(page.url()).pathname === '/listen'
  const menuClosedAfterRoute = await page.getByRole('dialog', { name: 'Primary navigation' }).count() === 0
  const bodyScrollRestored = await page.evaluate(() => getComputedStyle(document.body).overflow !== 'hidden')

  report.interactions = {
    menuOpened,
    scrollLocked,
    reverseTrapWorked,
    forwardTrapWorked,
    menuClosedWithEscape,
    focusReturned,
    routeChanged,
    menuClosedAfterRoute,
    bodyScrollRestored,
  }
  if (Object.values(report.interactions).some((value) => value !== true)) {
    report.failures.push({ interactions: report.interactions })
  }
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  report.textEnlargement = await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px'
    const contained = (selector) => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect()
      return Boolean(bounds && bounds.left >= -1 && bounds.right <= innerWidth + 1 && bounds.top >= -1 && bounds.bottom <= innerHeight + 1)
    }
    const wordmark = document.querySelector('.site-wordmark')?.getBoundingClientRect()
    const menu = document.querySelector('.menu-toggle')?.getBoundingClientRect()
    return {
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      actionsContained: contained('.signature-actions'),
      locationContained: contained('.signature-stage__location'),
      headerControlsSeparated: Boolean(wordmark && menu && wordmark.right < menu.left),
    }
  })
  if (
    report.textEnlargement.horizontalOverflow ||
    !report.textEnlargement.actionsContained ||
    !report.textEnlargement.locationContained ||
    !report.textEnlargement.headerControlsSeparated
  ) {
    report.failures.push({ textEnlargement: report.textEnlargement })
  }
  await context.close()
}

await browser.close()
await writeFile('.qa/home/report.json', JSON.stringify(report, null, 2))

console.log(JSON.stringify({
  viewportChecks: report.viewports.length,
  reducedMotion: report.reducedMotion,
  interactions: report.interactions,
  textEnlargement: report.textEnlargement,
  failures: report.failures,
}, null, 2))

if (report.failures.length > 0) process.exitCode = 1
