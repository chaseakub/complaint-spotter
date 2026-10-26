import { THEMES, matchedThemes, METHOD_VERSION } from './rules.js'

export const SMALL_SAMPLE = 20
const MIN_CHARACTERS = 20

// items: [{ text, rating }] where rating is 1 to 5 or null when the page did not show one.
export function analyze(items) {
  const seen = new Set()
  const reviews = []
  for (const item of items || []) {
    const text = String(item?.text || '').replace(/\s+/g, ' ').trim()
    if (text.length < MIN_CHARACTERS || seen.has(text)) continue
    seen.add(text)
    const rating = Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5 ? item.rating : null
    reviews.push({ text, rating })
  }
  const counts = new Map(THEMES.map(theme => [theme.id, 0]))
  let complaintReviews = 0, highRatedComplaints = 0, rated = 0
  for (const review of reviews) {
    const matches = matchedThemes(review.text)
    if (review.rating !== null) rated += 1
    if (!matches.length) continue
    complaintReviews += 1
    if (review.rating !== null && review.rating >= 4) highRatedComplaints += 1
    for (const theme of matches) counts.set(theme.id, counts.get(theme.id) + 1)
  }
  const total = reviews.length
  return {
    total, rated, complaintReviews, highRatedComplaints,
    smallSample: total < SMALL_SAMPLE,
    themes: THEMES.map(({ id, label }) => ({ id, label, count: counts.get(id), share: total ? counts.get(id) / total : 0 }))
      .sort((a, b) => b.count - a.count),
    methodVersion: METHOD_VERSION,
  }
}

// Pasted text: one review per line.
export function parsePasted(text) {
  return String(text || '').split(/\r?\n/).map(line => ({ text: line, rating: null }))
}
