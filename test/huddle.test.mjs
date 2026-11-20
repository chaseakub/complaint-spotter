import test from 'node:test'
import assert from 'node:assert/strict'
import { analyze } from '../src/analyze.js'
import { parseReviewCsv } from '../src/csv.js'
import { makeHuddle, huddleThemes, formatHuddle } from '../src/huddle.js'

test('a huddle counts unique matches for the chosen topic and only its known high ratings', () => {
  const model = analyze(parseReviewCsv([
    'review,stars',
    'The bag was missing fries when I got home,5',
    'The bag was missing fries when I got home,5',
    'They forgot my sauce at lunch today,1',
    'We waited too long for our meal on the patio,4',
    'The fries were missing on my takeout order,4oops',
  ].join('\n')))
  const [first] = huddleThemes(model)
  assert.equal(first.id, 'wrong_order')
  const card = makeHuddle(model, first.id)
  assert.equal(card.evidence, '3 of 4 reviews in this batch mention wrong or missing items. 1 was rated 4 or 5 stars.')
  assert.doesNotMatch(formatHuddle(card), /bag was missing|forgot my sauce/)
  card.followUp = 'Riley will check at the end of lunch.'
  assert.match(formatHuddle(card), /Riley will check/)
  assert.doesNotMatch(formatHuddle(card), /Recognition/)
})

test('no unsupported theme, ambiguous rating or empty batch becomes a generated card', () => {
  assert.deepEqual(huddleThemes({total: 0, themes: []}), [])
  const model = {total: 2, themes: [{id: 'wrong_order', count: 3}, {id: 'cold_food', count: 1, highRatedCount: 4}]}
  assert.equal(makeHuddle(model, 'wrong_order'), null)
  assert.equal(makeHuddle(model, 'cold_food').evidence, '1 of 2 reviews in this batch mentions food or drink temperature.')
})
