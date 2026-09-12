import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
await page.goto(pathToFileURL(process.cwd() + '/.qa/fonts/index.html').href, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
const m = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('2d')
  c.font = '100px "Mr Dafoe"'
  const t = (s) => { const x = c.measureText(s); return { w: +x.width.toFixed(1), left: +x.actualBoundingBoxLeft.toFixed(1), right: +x.actualBoundingBoxRight.toFixed(1), asc: +x.actualBoundingBoxAscent.toFixed(1), desc: +x.actualBoundingBoxDescent.toFixed(1), fontAsc: +x.fontBoundingBoxAscent.toFixed(1), fontDesc: +x.fontBoundingBoxDescent.toFixed(1) } }
  return { athi: t('athi'), a: t('a'), t: t('t'), h: t('h'), i: t('i'), ath: t('ath'), x: t('x') }
})
console.log(JSON.stringify(m, null, 1))
await browser.close()
