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
  { width: 430, height: 932 },
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]

const isTouchLayout = ({ width, height }) => (
  width <= 780 || (width <= 900 && height <= 500 && width > height)
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
  motionLifecycle: {},
  textEnlargement: {},
  failures: [],
}

for (const viewport of viewports) {
  const touchLayout = isTouchLayout(viewport)
  const context = await browser.newContext({
    viewport,
    hasTouch: touchLayout,
    reducedMotion: 'no-preference',
  })
  await context.addInitScript(() => sessionStorage.setItem('internet-athi-intro-seen', 'true'))
  const page = await context.newPage()
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1400)

  const metrics = await page.evaluate((expectsMenu) => {
    const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect().toJSON() ?? null
    const visible = (selector) => {
      const element = document.querySelector(selector)
      if (!element) return false
      const style = getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && bounds.width > 0 && bounds.height > 0
    }
    const stage = document.querySelector('.home-stage')
    const afterword = document.querySelector('.home-afterword')
    const portrait = document.querySelector('.home-stage__portrait img')
    const heroLinks = [...document.querySelectorAll('.home-stage__actions a, .home-stage__routes a')]
    const actionLinks = [...document.querySelectorAll('.home-stage__actions a')]
    const routeLinks = [...document.querySelectorAll('.home-stage__routes a')]
    const title = rect('.home-stage__release h1')
    const primary = rect('.home-stage__actions .action-link--primary')
    const routes = rect('.home-stage__routes')
    const stageStyle = stage ? getComputedStyle(stage) : null
    const portraitFrame = document.querySelector('.home-stage__portrait')
    const leftFragment = document.querySelector('.portrait-fragment--left')
    const ambient = document.querySelector('.home-stage__ambient')
    const decorativeElements = document.querySelectorAll(
      '.home-stage__ambient, .home-stage__grid, .home-stage__contrast, .portrait-fragment',
    )
    const inViewport = (bounds) => Boolean(
      bounds && bounds.left >= -1 && bounds.right <= innerWidth + 1 && bounds.top >= -1 && bounds.bottom <= innerHeight + 1
    )

    return {
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      stageHeight: stage?.getBoundingClientRect().height ?? 0,
      afterwordTop: afterword?.getBoundingClientRect().top ?? 0,
      title,
      primary,
      routes,
      titleInViewport: inViewport(title),
      primaryInViewport: inViewport(primary),
      routesInViewport: inViewport(routes),
      identityVisible: visible('.home-stage__identity'),
      portraitLoaded: Boolean(portrait?.complete && portrait.naturalWidth >= 548 && portrait.naturalHeight >= 552),
      menuVisible: visible('.menu-toggle'),
      desktopNavigationVisible: visible('.desktop-nav'),
      menuModeCorrect: expectsMenu ? visible('.menu-toggle') && !visible('.desktop-nav') : !visible('.menu-toggle') && visible('.desktop-nav'),
      heroLinkLabels: heroLinks.map((link) => link.textContent?.replace(/\s+/g, ' ').trim()),
      safeSecondaryLink: actionLinks[1]?.getAttribute('target') === '_blank' && (actionLinks[1]?.getAttribute('rel') ?? '').includes('noopener'),
      touchTargets: [...actionLinks, ...routeLinks].map((link) => ({
        label: link.textContent?.replace(/\s+/g, ' ').trim(),
        width: link.getBoundingClientRect().width,
        height: link.getBoundingClientRect().height,
      })),
      headingCount: document.querySelectorAll('h1').length,
      introCount: document.querySelectorAll('.intro').length,
      bodyOverflow: getComputedStyle(document.body).overflow,
      motionState: stage?.getAttribute('data-motion-state'),
      motionPlayState: stageStyle?.getPropertyValue('--motion-play-state').trim(),
      ambientAnimation: ambient ? getComputedStyle(ambient, '::before').animationName : '',
      portraitAnimation: portrait ? getComputedStyle(portrait).animationName : '',
      portraitFrameAnimation: portraitFrame ? getComputedStyle(portraitFrame).animationName : '',
      fragmentAnimation: leftFragment ? getComputedStyle(leftFragment).animationName : '',
      decorativePointerEventsDisabled: [...decorativeElements]
        .every((element) => getComputedStyle(element).pointerEvents === 'none'),
    }
  }, touchLayout)

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

  const result = { viewport, touchLayout, ...metrics, seriousAxeViolations, errors }
  report.viewports.push(result)
  const badTouchTarget = touchLayout && metrics.touchTargets.some((target) => target.height < 43.5 || target.width < 43.5)
  if (
    metrics.horizontalOverflow ||
    metrics.stageHeight < viewport.height - 1 ||
    metrics.afterwordTop < viewport.height - 1 ||
    !metrics.titleInViewport ||
    !metrics.primaryInViewport ||
    !metrics.routesInViewport ||
    !metrics.identityVisible ||
    !metrics.portraitLoaded ||
    !metrics.menuModeCorrect ||
    metrics.heroLinkLabels.length !== 5 ||
    !metrics.safeSecondaryLink ||
    badTouchTarget ||
    metrics.headingCount !== 1 ||
    metrics.introCount !== 0 ||
    metrics.bodyOverflow === 'hidden' ||
    metrics.motionState !== 'running' ||
    metrics.motionPlayState !== 'running' ||
    !metrics.ambientAnimation.includes('home-ambient-drift') ||
    !metrics.portraitAnimation.includes('home-portrait-breathe') ||
    !metrics.decorativePointerEventsDisabled ||
    seriousAxeViolations.length > 0 ||
    errors.length > 0
  ) {
    report.failures.push({ viewport, result })
  }

  await context.close()
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  const touchLayout = isTouchLayout(viewport)
  const context = await browser.newContext({ viewport, hasTouch: touchLayout, reducedMotion: 'reduce' })
  await context.addInitScript(() => sessionStorage.setItem('internet-athi-intro-seen', 'true'))
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const result = await page.evaluate(() => {
    const portrait = document.querySelector('.home-stage__portrait')
    const image = document.querySelector('.home-stage__portrait img')
    const scan = getComputedStyle(portrait, '::before')
    const ambient = document.querySelector('.home-stage__ambient')
    const fragment = document.querySelector('.portrait-fragment--left')
    const stage = document.querySelector('.home-stage')
    return {
      portraitAnimation: getComputedStyle(portrait).animationName,
      imageAnimation: getComputedStyle(image).animationName,
      ambientAnimation: getComputedStyle(ambient, '::before').animationName,
      fragmentAnimation: getComputedStyle(fragment).animationName,
      scanDisplay: scan.display,
      portraitOpacity: getComputedStyle(portrait).opacity,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      motionState: stage?.getAttribute('data-motion-state'),
    }
  })
  report.reducedMotion.push({ viewport, ...result })
  if (
    result.portraitAnimation !== 'none' ||
    result.imageAnimation !== 'none' ||
    result.ambientAnimation !== 'none' ||
    result.fragmentAnimation !== 'none' ||
    result.scanDisplay !== 'none' ||
    result.portraitOpacity !== '1' ||
    result.motionState !== 'paused' ||
    result.horizontalOverflow
  ) {
    report.failures.push({ viewport, reducedMotion: result })
  }
  await context.close()
}

{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    hasTouch: false,
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)

  const sampleMotion = () => page.evaluate(() => {
    const stage = document.querySelector('.home-stage')
    const frame = document.querySelector('.home-stage__portrait')?.getBoundingClientRect()
    return {
      leftTransform: getComputedStyle(document.querySelector('.portrait-fragment--left')).transform,
      rightTransform: getComputedStyle(document.querySelector('.portrait-fragment--right')).transform,
      portraitTransform: getComputedStyle(document.querySelector('.home-stage__portrait img')).transform,
      frame: frame ? { x: frame.x, y: frame.y, width: frame.width, height: frame.height } : null,
      motionState: stage?.getAttribute('data-motion-state'),
      imagePlayState: getComputedStyle(document.querySelector('.home-stage__portrait img')).animationPlayState,
    }
  })

  const first = await sampleMotion()
  await page.waitForTimeout(1100)
  const second = await sampleMotion()
  await page.mouse.move(1390, 760)
  await page.waitForTimeout(450)
  const pointer = await page.evaluate(() => {
    const stage = document.querySelector('.home-stage')
    return {
      ambientX: Number.parseFloat(getComputedStyle(stage).getPropertyValue('--ambient-parallax-x')),
      ambientY: Number.parseFloat(getComputedStyle(stage).getPropertyValue('--ambient-parallax-y')),
    }
  })

  await page.evaluate(() => {
    const afterword = document.querySelector('.home-afterword')
    window.scrollTo({ top: (afterword?.offsetTop ?? innerHeight) + (innerHeight * 0.5), behavior: 'instant' })
  })
  await page.waitForTimeout(350)
  const paused = await sampleMotion()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(350)
  const resumed = await sampleMotion()
  await page.getByRole('link', { name: 'Listen', exact: true }).click()
  await page.goBack()
  await page.waitForTimeout(350)
  const returnEntrance = await page.evaluate(() => ({
    entranceState: document.querySelector('.home-stage')?.getAttribute('data-entrance-state'),
    frameAnimation: getComputedStyle(document.querySelector('.home-stage__portrait')).animationName,
    imageAnimation: getComputedStyle(document.querySelector('.home-stage__portrait img')).animationName,
    titleAnimation: getComputedStyle(document.querySelector('.home-stage__release h1')).animationName,
  }))

  report.motionLifecycle = {
    autonomousMotionVisible: (
      first.leftTransform !== second.leftTransform &&
      first.rightTransform !== second.rightTransform &&
      first.portraitTransform !== second.portraitTransform
    ),
    portraitFrameStable: Boolean(
      first.frame && second.frame &&
      Math.abs(first.frame.x - second.frame.x) < 0.5 &&
      Math.abs(first.frame.y - second.frame.y) < 0.5 &&
      Math.abs(first.frame.width - second.frame.width) < 0.5 &&
      Math.abs(first.frame.height - second.frame.height) < 0.5
    ),
    pointerDepthResponded: Math.abs(pointer.ambientX) > 1 && Math.abs(pointer.ambientY) > 1,
    pausedOffscreen: paused.motionState === 'paused' && paused.imagePlayState.includes('paused'),
    resumedOnReturn: resumed.motionState === 'running' && resumed.imagePlayState.includes('running'),
    entranceNotReplayed: (
      returnEntrance.entranceState === 'settled' &&
      returnEntrance.frameAnimation === 'none' &&
      returnEntrance.imageAnimation === 'home-portrait-breathe' &&
      returnEntrance.titleAnimation === 'none'
    ),
  }
  if (Object.values(report.motionLifecycle).some((value) => value !== true)) {
    report.failures.push({ motionLifecycle: report.motionLifecycle, first, second, pointer, paused, resumed, returnEntrance })
  }
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const introSuppressedOnTouch = await page.locator('.intro').count() === 0
  const menuButton = page.getByRole('button', { name: 'Menu' })
  await menuButton.click()
  const menuOpened = await page.locator('.mobile-menu__panel').isVisible()
  await page.keyboard.press('Escape')
  const menuClosedWithEscape = await page.locator('.mobile-menu__panel').count() === 0
  const focusReturned = await menuButton.evaluate((button) => document.activeElement === button)
  await menuButton.click()
  await page.locator('.mobile-menu__panel').getByRole('link', { name: /Listen/ }).click()
  const routeChanged = new URL(page.url()).pathname === '/listen'
  const menuClosedAfterRoute = await page.locator('.mobile-menu__panel').count() === 0
  const bodyScrollRestored = await page.evaluate(() => getComputedStyle(document.body).overflow !== 'hidden')

  report.interactions = {
    introSuppressedOnTouch,
    menuOpened,
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
  await context.addInitScript(() => sessionStorage.setItem('internet-athi-intro-seen', 'true'))
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  report.textEnlargement = await page.evaluate(() => {
    document.documentElement.style.fontSize = '20px'
    const title = document.querySelector('.home-stage__release h1')?.getBoundingClientRect()
    const primary = document.querySelector('.home-stage__actions .action-link--primary')?.getBoundingClientRect()
    return {
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      titleContained: Boolean(title && title.left >= -1 && title.right <= innerWidth + 1),
      primaryContained: Boolean(primary && primary.left >= -1 && primary.right <= innerWidth + 1),
    }
  })
  if (Object.values(report.textEnlargement).some((value) => value !== false && value !== true) ||
      report.textEnlargement.horizontalOverflow ||
      !report.textEnlargement.titleContained ||
      !report.textEnlargement.primaryContained) {
    report.failures.push({ textEnlargement: report.textEnlargement })
  }
  await context.close()
}

await browser.close()
await writeFile('.qa/home/report.json', JSON.stringify(report, null, 2))

console.log(JSON.stringify({
  viewportChecks: report.viewports.length,
  reducedMotionChecks: report.reducedMotion,
  interactions: report.interactions,
  motionLifecycle: report.motionLifecycle,
  textEnlargement: report.textEnlargement,
  failures: report.failures,
}, null, 2))

if (report.failures.length > 0) process.exitCode = 1
