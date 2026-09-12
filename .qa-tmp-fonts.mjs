import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1100, height: 3200 } })
await page.goto(pathToFileURL(process.cwd() + '/.qa/fonts/index.html').href, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(800)
const metrics = await page.evaluate(() => [...document.querySelectorAll('.word')].map((el) => ({ font: el.dataset.font, widthPer100px: (el.getBoundingClientRect().width / 190 * 100).toFixed(1), loaded: document.fonts.check(`100px "${getComputedStyle(el).fontFamily.replace(/"/g, '')}"`) })))
console.log(JSON.stringify(metrics))
await page.screenshot({ path: '.qa/fonts/sheet-1.png', clip: { x: 0, y: 0, width: 1100, height: 1680 } })
await page.screenshot({ path: '.qa/fonts/sheet-2.png', clip: { x: 0, y: 1680, width: 1100, height: 1500 } })
await browser.close()
