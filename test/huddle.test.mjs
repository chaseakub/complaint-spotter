import test from 'node:test'
import assert from 'node:assert/strict'
import { analyze } from '../src/analyze.js'
import { parseReviewCsv } from '../src/csv.js'
import { makeHuddle, huddleThemes, formatHuddle, rexHuddleUrl } from '../src/huddle.js'

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

test('Rex receives only the current card, including Unicode edits, in a browser fragment', () => {
  const card = {title: 'Équipe 🍋', evidence: '2 of 4 reviews mention missing items.', action: 'Check the café bags.', followUp: 'Talk to Ana.', recognition: '', reviews: ['Private original review']}
  const link = new URL(rexHuddleUrl(card, 'wrong_order'))
  assert.equal(link.origin + link.pathname + link.search, 'https://app.repliohq.com/?page=rex')
  assert.match(link.hash, /^#\/rex\/review-huddle\?card=[\w-]+$/)
  const received = JSON.parse(Buffer.from(link.hash.split('=')[1], 'base64url').toString('utf8'))
  assert.deepEqual(received, {v: 1, themeId: 'wrong_order', title: card.title, evidence: card.evidence, action: card.action, followUp: card.followUp, recognition: ''})
  assert.throws(() => rexHuddleUrl({...card, action: ' '}, 'wrong_order'), /what the team should check/)
  assert.throws(() => rexHuddleUrl({...card, action: 'x'.repeat(1201)}, 'wrong_order'), /1201/)
  assert.throws(() => rexHuddleUrl(card, 'unrecognized'), /focus/)
})
