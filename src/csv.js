// Vendored from replio-landing public/js/operator-tools-core.js @ 81c793f (csvRows), plus column lookup for the CLI.
// Strict RFC-style CSV parsing: quoted commas, newlines and doubled quotes.
// Reject malformed rows rather than silently analysing the wrong column.
function invalid(message) {
  throw new Error(message)
}

export function csvRows(input) {
  const rows = []
  let row = [], field = '', quoted = false, closedQuote = false
  const finishField = () => { row.push(field); field = ''; closedQuote = false }
  const finishRow = () => { finishField(); if (row.some(value => value.trim())) rows.push(row); row = [] }
  input = String(input).replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') { field += '"'; index += 1 }
        else { quoted = false; closedQuote = true }
      } else field += character
      continue
    }
    if (character === ',') { finishField(); continue }
    if (character === '\n') { finishRow(); continue }
    if (closedQuote) invalid('A closing CSV quote must be followed by a comma or a new line.')
    if (character === '"') {
      if (field.length) invalid('A CSV quote must begin a field. Escape quotes inside a quoted field by doubling them.')
      quoted = true
    } else field += character
  }
  if (quoted) invalid('The CSV contains an unclosed quoted field.')
  if (field.length || row.length || closedQuote) finishRow()
  return rows
}

const column = (header, pattern, name, required) => {
  const found = header.map((value, index) => pattern.test(value.trim()) ? index : -1).filter(index => index >= 0)
  if (found.length > 1 || (required && !found.length)) invalid(`CSV needs exactly one ${name} column.`)
  return found.length ? found[0] : -1
}

// Returns [{ text, rating }]. Review column: text, review or review_text. Optional rating column: rating, stars or star_rating.
export function parseReviewCsv(input) {
  const rows = csvRows(input)
  const header = rows.shift() || []
  const textAt = column(header, /^(text|review|review_text)$/i, 'review (text, review or review_text)', true)
  const ratingAt = column(header, /^(rating|stars|star_rating)$/i, 'rating (rating, stars or star_rating)', false)
  if (rows.some(row => row.length !== header.length)) invalid('Every CSV row must have the same number of columns as the header.')
  return rows.map(row => ({ text: row[textAt], rating: ratingAt < 0 ? null : Number.parseInt(row[ratingAt], 10) }))
}
