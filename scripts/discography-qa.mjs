import { mkdir, writeFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173'
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]
const expected = [
  {
    label: 'Open Polymorphism album on Spotify',
    href: 'https://open.spotify.com/album/2pduDMmEcftxkrJNIgZYS3?si=i2-u9yUSSxuRwpdx-ccqmA',
    image: '/assets/polymorphism-cover.jpg',
  },
  {
    label: 'Open Undithembisile single on Spotify',
    href: 'https://open.spotify.com/album/5OHGpGAwjRjp4R1EcVnpGr?si=YIHGVBxTRdqeCW4dS9-yyQ',
    image: '/assets/undithembisile-cover.jpg',
  },
  {
    label: 'Open Nguwe single on Spotify',
    href: 'https://open.spotify.com/album/1lbVmXMwuOaR7IGh4V47cQ?si=tRXqCMhsRsyCbYYlE_L1rQ',
    image: '/assets/nguwe-cover.jpg',
  },
  {
    label: 'Open Wena single on Spotify',
    href: 'https://open.spotify.com/album/0EcfvhqnPSeJnKyeoVSypt?si=emFWYvV4RyGOnWZHzH19RA',
    image: '/assets/wena-cover.jpg',
  },
]

await mkdir('.qa/discography', { recursive: true })

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--disable-gpu'],
})
const report = { viewports: [], reducedMotion: [], desktopSequence: {}, rotation: {}, failures: [] }

for (const viewport of viewports) {
  const touchLayout = viewport.width <= 768
  const context = await browser.newContext({ viewport, hasTouch: touchLayout, reducedMotion: 'no-preference' })
  await context.addInitScript(() => sessionStorage.setItem('internet-athi-intro-seen', 'true'))
  const page = await context.newPage()
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))

  await page.goto(`${baseUrl}/listen`, { waitUntil: 'networkidle' })
  await page.locator('.discography-surfer').waitFor()

  const mobileTrack = page.locator('.discography-mobile-track')
  if (await mobileTrack.count()) {
    await mobileTrack.evaluate((track) => track.scrollTo({ left: track.scrollWidth, behavior: 'instant' }))
    await page.waitForFunction(() => (
      [...document.querySelectorAll('.discography-mobile-track img')]
        .every((image) => image.complete && image.naturalWidth > 0)
    ))
    await mobileTrack.evaluate((track) => track.scrollTo({ left: 0, behavior: 'instant' }))
  }

  const metrics = await page.evaluate((releaseData) => {
    const section = document.querySelector('.discography-surfer')
    const links = [...document.querySelectorAll('.discography-surfer a[aria-label$="on Spotify"]')]
    const images = [...document.querySelectorAll('.discography-surfer img')]
    const activeMetadata = document.querySelector('.discography-surfer-card.is-active .discography-surfer-card__metadata')
    const activeStyle = activeMetadata ? getComputedStyle(activeMetadata) : null
    const fixedChildren = [...document.querySelectorAll('.discography-surfer *')]
      .filter((element) => getComputedStyle(element).position === 'fixed').length

    return {
      layout: section?.className ?? '',
      heading: section?.querySelector('h1')?.textContent?.trim() ?? '',
      labels: links.map((link) => link.getAttribute('aria-label')),
      hrefs: links.map((link) => link.getAttribute('href')),
      safeLinks: links.every((link) => link.getAttribute('target') === '_blank' && (link.getAttribute('rel') ?? '').includes('noopener')),
      imageSources: images.map((image) => new URL(image.currentSrc || image.src).pathname),
      imageSizes: images.map((image) => ({ complete: image.complete, width: image.naturalWidth, height: image.naturalHeight })),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      sectionHeights: section ? section.getBoundingClientRect().height / window.innerHeight : 0,
      fixedChildren,
      activeMetadataVisible: activeStyle ? activeStyle.visibility === 'visible' && Number(activeStyle.opacity) > 0.9 : true,
      hasNaNTransform: [...document.querySelectorAll('.discography-surfer-card')]
        .some((card) => getComputedStyle(card).transform.includes('NaN')),
      footerExists: Boolean(document.querySelector('.site-footer')),
      expectedCount: releaseData.length,
    }
  }, expected)

  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const seriousAxeViolations = axeResults.violations
    .filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))
    .map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length }))

  await page.screenshot({
    path: `.qa/discography/${viewport.width}x${viewport.height}.png`,
    fullPage: false,
  })

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(80)
  const footerReachable = await page.locator('.site-footer').isVisible()

  const checks = {
    ...metrics,
    seriousAxeViolations,
    errors,
    footerReachable,
  }
  report.viewports.push({ viewport, ...checks })

  const failed = (
    metrics.heading !== 'Discography' ||
    JSON.stringify(metrics.labels) !== JSON.stringify(expected.map((item) => item.label)) ||
    JSON.stringify(metrics.hrefs) !== JSON.stringify(expected.map((item) => item.href)) ||
    JSON.stringify(metrics.imageSources) !== JSON.stringify(expected.map((item) => item.image)) ||
    !metrics.safeLinks ||
    metrics.imageSizes.some((image) => !image.complete || image.width < 640 || image.height < 640) ||
    metrics.horizontalOverflow ||
    metrics.fixedChildren > 0 ||
    metrics.hasNaNTransform ||
    !metrics.footerExists ||
    !footerReachable ||
    seriousAxeViolations.length > 0 ||
    errors.length > 0 ||
    (!touchLayout && !metrics.activeMetadataVisible) ||
    (!touchLayout && metrics.sectionHeights > 6)
  )
  if (failed) report.failures.push({ viewport, checks })

  await context.close()
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', hasTouch: viewport.width < 780 })
  await context.addInitScript(() => sessionStorage.setItem('internet-athi-intro-seen', 'true'))
  const page = await context.newPage()
  await page.goto(`${baseUrl}/listen`, { waitUntil: 'networkidle' })
  const result = await page.evaluate(() => ({
    staticLayout: document.querySelector('.discography-surfer')?.classList.contains('discography-surfer--static') ?? false,
    releaseLinks: document.querySelectorAll('.discography-surfer a[aria-label$="on Spotify"]').length,
    sectionViewports: (document.querySelector('.discography-surfer')?.getBoundingClientRect().height ?? 0) / window.innerHeight,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
  }))
  report.reducedMotion.push({ viewport, ...result })
  if (!result.staticLayout || result.releaseLinks !== 4 || result.horizontalOverflow || result.sectionViewports > 5) {
    report.failures.push({ viewport, reducedMotion: result })
  }
  await context.close()
}

{
  const viewport = { width: 1440, height: 900 }
  const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' })
  await context.addInitScript(() => sessionStorage.setItem('internet-athi-intro-seen', 'true'))
  const page = await context.newPage()
  await page.goto(`${baseUrl}/listen`, { waitUntil: 'networkidle' })
  const sequence = []
  for (let index = 0; index < expected.length; index += 1) {
    await page.evaluate(({ releaseIndex, releaseCount }) => {
      const section = document.querySelector('.discography-surfer')
      if (!section) return
      const top = window.scrollY + section.getBoundingClientRect().top
      const travel = section.getBoundingClientRect().height - window.innerHeight
      window.scrollTo({ top: top + (releaseIndex / (releaseCount - 1)) * travel, behavior: 'instant' })
    }, { releaseIndex: index, releaseCount: expected.length })
    await page.waitForTimeout(650)
    const label = await page.locator('.discography-surfer-card.is-active > a').getAttribute('aria-label')
    const transform = await page.locator('.discography-surfer-card.is-active').evaluate((element) => getComputedStyle(element).transform)
    sequence.push({ label, transform })
    await page.screenshot({ path: `.qa/discography/desktop-release-${index + 1}.png`, fullPage: false })
  }

  await page.locator('.discography-surfer-card > a').first().focus()
  const focused = []
  for (let index = 0; index < expected.length; index += 1) {
    if (index > 0) await page.keyboard.press('Tab')
    focused.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')))
    await page.waitForTimeout(120)
  }
  await page.keyboard.press('Tab')
  const tabbedPastSection = await page.evaluate(() => !document.activeElement?.closest('.discography-surfer'))

  report.desktopSequence = { sequence, focused, tabbedPastSection }
  if (
    JSON.stringify(sequence.map((item) => item.label)) !== JSON.stringify(expected.map((item) => item.label)) ||
    sequence.some((item) => item.transform.includes('NaN')) ||
    JSON.stringify(focused) !== JSON.stringify(expected.map((item) => item.label)) ||
    !tabbedPastSection
  ) {
    report.failures.push({ desktopSequence: report.desktopSequence })
  }
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
  await context.addInitScript(() => sessionStorage.setItem('internet-athi-intro-seen', 'true'))
  const page = await context.newPage()
  await page.goto(`${baseUrl}/listen`, { waitUntil: 'networkidle' })
  await page.setViewportSize({ width: 844, height: 390 })
  await page.waitForTimeout(120)
  report.rotation = await page.evaluate(() => ({
    mobileLayout: document.querySelector('.discography-surfer')?.classList.contains('discography-surfer--mobile') ?? false,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    footerExists: Boolean(document.querySelector('.site-footer')),
  }))
  if (!report.rotation.mobileLayout || report.rotation.horizontalOverflow || !report.rotation.footerExists) {
    report.failures.push({ rotation: report.rotation })
  }
  await context.close()
}

await browser.close()
await writeFile('.qa/discography/report.json', JSON.stringify(report, null, 2))

console.log(JSON.stringify({
  viewportChecks: report.viewports.length,
  reducedMotionChecks: report.reducedMotion,
  desktopSequence: report.desktopSequence,
  rotation: report.rotation,
  failures: report.failures,
}, null, 2))

if (report.failures.length > 0) process.exitCode = 1
