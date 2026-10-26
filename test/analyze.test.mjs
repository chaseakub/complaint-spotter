import test from 'node:test'
import assert from 'node:assert/strict'
import { analyze, parsePasted } from '../src/analyze.js'

test('counts themes per review once and tracks 4 and 5 star complaints', () => {
  const r = analyze([
    { text: 'My order was missing the fries and the fries were missing again.', rating: 5 },
    { text: 'The food was cold and we waited too long for it.', rating: 1 },
    { text: 'Great team and a tasty sandwich, would come back.', rating: 4 },
  ])
  const by = Object.fromEntries(r.themes.map(t => [t.id, t.count]))
  assert.equal(r.total, 3)
  assert.equal(r.complaintReviews, 2)
  assert.equal(r.highRatedComplaints, 1)
  assert.equal(by.wrong_order, 1)
  assert.equal(by.cold_food, 1)
  assert.equal(by.slow_service, 1)
  assert.equal(r.smallSample, true)
  assert.equal(r.methodVersion, 'food-drink-rules-1.0')
})

test('negations, duplicates and short fragments are not counted', () => {
  const r = analyze([
    { text: 'The food was not cold and service was never slow, lovely.', rating: 5 },
    { text: 'The food was not cold and service was never slow, lovely.', rating: 5 },
    { text: 'cold food', rating: 1 },
  ])
  assert.equal(r.total, 1)
  assert.equal(r.complaintReviews, 0)
})

test('ratings outside 1 to 5 are treated as unknown', () => {
  const r = analyze([{ text: 'They forgot my drink and the order was wrong again.', rating: 9 }])
  assert.equal(r.rated, 0)
  assert.equal(r.highRatedComplaints, 0)
  assert.equal(r.complaintReviews, 1)
})

test('pasted text splits one review per line', () => {
  const r = analyze(parsePasted('Our order was missing a side today, again.\r\nRude cashier at the register this morning.\n\n'))
  assert.equal(r.total, 2)
  assert.equal(r.complaintReviews, 2)
})
