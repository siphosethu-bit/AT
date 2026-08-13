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

const expectsMobileArtwork = ({ width, height }) => width <= 1023 && height > width
const expectsMenu = ({ width, height }) => (
  width <= 767 ||
  (width <= 1023 && height > width) ||
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
  returnVisit: {},
  textEnlargement: {},
  failures: [],
}

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, hasTouch: expectsMenu(viewport) })
  const page = await context.newPage()
  const errors = []
  const artworkRequests = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
  page.on('request', (request) => {
    if (request.url().includes('internet-athi-hero-')) {
      artworkRequests.push(request.url().split('/').at(-1))
    }
  })

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1100)

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
    const artwork = document.querySelector('.home-artwork__image')
    const stage = rect('.home-stage')
    const title = rect('.landing-release h1')
    const actions = rect('.release-actions')
    const indicator = rect('.release-indicator')
    const actionLinks = [...document.querySelectorAll('.release-actions a')]
    const routeLinks = [...document.querySelectorAll('.desktop-nav a')]

    return {
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      stage,
      afterwordTop: rect('.home-afterword')?.top ?? 0,
      title,
      actions,
      indicator,
      titleInViewport: inViewport(title),
      actionsInViewport: inViewport(actions),
      indicatorInViewport: inViewport(indicator),
      headingCount: document.querySelectorAll('h1').length,
      titleLines: [...document.querySelectorAll('.landing-release__line')].map((line) => line.textContent?.trim()),
      artworkLoaded: Boolean(artwork?.complete && artwork.naturalWidth > 0 && artwork.naturalHeight > 0),
      artworkSource: artwork?.currentSrc.split('/').at(-1),
      artworkDimensions: artwork ? { width: artwork.naturalWidth, height: artwork.naturalHeight } : null,
      artworkPointerEvents: getComputedStyle(document.querySelector('.home-artwork')).pointerEvents,
      menuModeCorrect: menuExpected
        ? visible('.menu-toggle') && !visible('.desktop-nav')
        : !visible('.menu-toggle') && visible('.desktop-nav'),
      identityModeCorrect: menuExpected && innerHeight > innerWidth
        ? !visible('.artist-introduction')
        : visible('.artist-introduction'),
      actionLinks: actionLinks.map((link) => ({
        label: link.textContent?.trim(),
        href: link.getAttribute('href'),
        target: link.getAttribute('target'),
        rel: link.getAttribute('rel'),
        width: link.getBoundingClientRect().width,
        height: link.getBoundingClientRect().height,
      })),
      routeLinks: routeLinks.map((link) => link.getAttribute('href')),
      motionState: document.querySelector('.home-stage')?.getAttribute('data-motion-state'),
      motionPlayState: getComputedStyle(document.querySelector('.home-stage')).getPropertyValue('--motion-play-state').trim(),
    }
  }, expectsMenu(viewport))

  const headingAccessible = await page.getByRole('heading', { level: 1, name: 'Polymorphism' }).count() === 1
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

  const expectedArtwork = expectsMobileArtwork(viewport)
    ? 'internet-athi-hero-mobile.png'
    : 'internet-athi-hero-desktop.png'
  const expectedDimensions = expectsMobileArtwork(viewport)
    ? { width: 853, height: 1844 }
    : { width: 1672, height: 941 }
  const uniqueArtworkRequests = [...new Set(artworkRequests)]
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
    expectedArtwork,
    uniqueArtworkRequests,
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
    !metrics.titleInViewport ||
    !metrics.actionsInViewport ||
    !metrics.indicatorInViewport ||
    metrics.headingCount !== 1 ||
    !headingAccessible ||
    metrics.titleLines.join(' ') !== 'POLY MORPHISM' ||
    !metrics.artworkLoaded ||
    metrics.artworkSource !== expectedArtwork ||
    JSON.stringify(metrics.artworkDimensions) !== JSON.stringify(expectedDimensions) ||
    uniqueArtworkRequests.length !== 1 ||
    uniqueArtworkRequests[0] !== expectedArtwork ||
    metrics.artworkPointerEvents !== 'none' ||
    !metrics.menuModeCorrect ||
    !metrics.identityModeCorrect ||
    !actionsCorrect ||
    JSON.stringify(metrics.routeLinks) !== JSON.stringify(['/listen', '/live', '/story', '/book']) ||
    metrics.motionState !== 'running' ||
    metrics.motionPlayState !== 'running' ||
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
    const stage = document.querySelector('.home-stage')
    const artwork = document.querySelector('.home-artwork')
    const image = document.querySelector('.home-artwork__image')
    const titleLine = document.querySelector('.landing-release__line > span')
    return {
      artworkAnimation: getComputedStyle(artwork).animationName,
      imageAnimation: getComputedStyle(image).animationName,
      titleAnimation: getComputedStyle(titleLine).animationName,
      artworkOpacity: getComputedStyle(artwork).opacity,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      motionState: stage?.getAttribute('data-motion-state'),
    }
  })
  report.reducedMotion.push({ viewport, ...result })
  if (
    result.artworkAnimation !== 'none' ||
    result.imageAnimation !== 'none' ||
    result.titleAnimation !== 'none' ||
    result.artworkOpacity !== '1' ||
    result.motionState !== 'paused' ||
    result.horizontalOverflow
  ) {
    report.failures.push({ viewport, reducedMotion: result })
  }
  await context.close()
}

{
  const viewport = { width: 1868, height: 912 }
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Listen', exact: true }).click()
  await page.goBack({ waitUntil: 'networkidle' })
  await page.waitForTimeout(100)
  report.returnVisit = await page.evaluate(() => {
    const stage = document.querySelector('.home-stage')?.getBoundingClientRect()
    const artwork = document.querySelector('.home-artwork')?.getBoundingClientRect()
    const image = document.querySelector('.home-artwork__image')
    return {
      entranceState: document.querySelector('.home-stage')?.getAttribute('data-entrance-state'),
      artworkCentered: Boolean(stage && artwork && Math.abs(
        (stage.left + stage.width / 2) - (artwork.left + artwork.width / 2),
      ) < 1),
      artworkFillsViewport: Boolean(stage && artwork && (
        Math.abs(stage.left - artwork.left) < 1 &&
        Math.abs(stage.right - artwork.right) < 1
      )),
      correctArtwork: image?.currentSrc.endsWith('/assets/internet-athi-hero-desktop.png'),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
    }
  })
  await page.screenshot({ path: '.qa/home/1868x912-return-visit.png', fullPage: false })
  if (
    report.returnVisit.entranceState !== 'settled' ||
    !report.returnVisit.artworkCentered ||
    !report.returnVisit.artworkFillsViewport ||
    !report.returnVisit.correctArtwork ||
    report.returnVisit.horizontalOverflow
  ) {
    report.failures.push({ returnVisit: report.returnVisit })
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
  await page.locator('.mobile-menu__panel').getByRole('link', { name: /Listen/ }).click()
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
      actionsContained: contained('.release-actions'),
      indicatorContained: contained('.release-indicator'),
      headerControlsSeparated: Boolean(wordmark && menu && wordmark.right < menu.left),
    }
  })
  if (
    report.textEnlargement.horizontalOverflow ||
    !report.textEnlargement.actionsContained ||
    !report.textEnlargement.indicatorContained ||
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
  returnVisit: report.returnVisit,
  textEnlargement: report.textEnlargement,
  failures: report.failures,
}, null, 2))

if (report.failures.length > 0) process.exitCode = 1
