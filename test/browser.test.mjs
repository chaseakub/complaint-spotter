// Extractor against fixture pages, then the real extension loaded in Chromium.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { expandReviews, extractReviews } from '../src/extract.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

async function onHost(page, host, path, fixture) {
  // Route a fake Google or Yelp URL to the fixture so the host checks run as they would live.
  await page.route(`https://${host}/**`, route => readFile(join(ROOT, 'test/fixtures', fixture), 'utf8')
    .then(body => route.fulfill({ status: 200, contentType: 'text/html', body })))
  await page.goto(`https://${host}${path}`)
}
const run = (page, fn) => page.evaluate(`(${fn.toString()})()`)

test('extractor reads Google Maps and Yelp review blocks', async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await onHost(page, 'www.google.com', '/maps/place/Example', 'google.html')
  assert.equal(await run(page, expandReviews), 1)
  const g = await run(page, extractReviews)
  assert.equal(g.source, 'google')
  assert.deepEqual(g.reviews.map(r => r.rating), [5, 1, 4, 2])
  assert.match(g.reviews[0].text, /missing the fries/)
  const y = await (async () => { await onHost(page, 'www.yelp.com', '/biz/example', 'yelp.html'); return run(page, extractReviews) })()
  assert.equal(y.source, 'yelp')
  assert.deepEqual(y.reviews.map(r => r.rating), [4, 5, 1])
  await page.goto('about:blank')
  assert.equal((await run(page, extractReviews)).source, 'unsupported')
  await browser.close()
})

test('extension loads, popup renders and counts pasted reviews', async () => {
  const ctx = await chromium.launchPersistentContext(await mkdtemp(join(tmpdir(), 'spotter-')), {
    channel: 'chromium', headless: true, args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`],
  })
  // Chrome derives an unpacked extension's id from the SHA-256 of its path, hex digits mapped to a to p.
  const id = createHash('sha256').update(ROOT).digest('hex').slice(0, 32).replace(/./g, c => String.fromCharCode(97 + parseInt(c, 16)))
  const page = await ctx.newPage()
  try {
  assert.ok(id, 'extension id')
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`chrome-extension://${id}/src/popup.html`)
  await page.click('summary')
  await page.fill('#paste', 'Our order was missing a side today, again.\nThe food was cold when it arrived.\nGreat team, everything was perfect today.')
  await page.click('#run-paste')
  assert.equal(await page.textContent('#r-total'), '3')
  assert.equal(await page.textContent('#r-complaints'), '2')
  assert.equal(await page.isHidden('#r-high-box'), true)
  assert.match(await page.textContent('#status'), /Read 3 reviews from your paste/)
  await page.screenshot({ path: join(tmpdir(), 'spotter-popup.png'), fullPage: true })
  assert.deepEqual(errors, [])
  } finally { await ctx.close() }
})
