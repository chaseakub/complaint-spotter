import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseReviewCsv } from '../src/csv.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const cli = (...args) => execFileSync(process.execPath, [join(ROOT, 'bin/complaint-spotter.mjs'), ...args], { encoding: 'utf8' })

test('CSV parser handles quoted commas, doubled quotes, newlines and optional ratings', () => {
  const rows = parseReviewCsv('﻿stars,review\r\n5,"Great, but ""wrong"" sauce\nagain"\n,No rating here at all\n')
  assert.deepEqual(rows, [{ text: 'Great, but "wrong" sauce\nagain', rating: 5 }, { text: 'No rating here at all', rating: NaN }])
  assert.deepEqual(parseReviewCsv('text\nhello there'), [{ text: 'hello there', rating: null }])
})

test('CSV parser rejects a missing review column and ragged rows', () => {
  assert.throws(() => parseReviewCsv('comment,rating\nhi,5'), /exactly one review/)
  assert.throws(() => parseReviewCsv('text,rating\nhi,5,extra'), /same number of columns/)
  assert.throws(() => parseReviewCsv('text\n"unclosed'), /unclosed/)
})

test('CLI counts the example file the same way as the extension', () => {
  const result = JSON.parse(cli(join(ROOT, 'examples/sample-reviews.csv'), '--json'))
  const by = Object.fromEntries(result.themes.map(t => [t.id, t.count]))
  assert.equal(result.total, 24)
  assert.equal(result.complaintReviews, 18)
  assert.equal(result.highRatedComplaints, 4)
  assert.equal(by.wrong_order, 7)
  assert.equal(by.allergy_safety, 1)
  assert.match(cli(join(ROOT, 'examples/sample-reviews.csv')), /Wrong or missing items\s+7\s+29%/)
})
