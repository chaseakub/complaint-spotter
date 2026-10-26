#!/usr/bin/env node
// Count repeat complaint themes in a CSV or text file of reviews. Same rules as the extension.
// Usage: node bin/complaint-spotter.mjs <file.csv|file.txt|-> [--json]
import { readFile } from 'node:fs/promises'
import { analyze, parsePasted } from '../src/analyze.js'
import { parseReviewCsv } from '../src/csv.js'

const args = process.argv.slice(2)
const json = args.includes('--json')
const file = args.find(arg => !arg.startsWith('--'))

if (!file || args.includes('--help')) {
  console.log(`Usage: node bin/complaint-spotter.mjs <reviews.csv | reviews.txt | -> [--json]

  CSV: one column named text, review or review_text; optional rating, stars or star_rating (1 to 5).
  TXT or "-" (stdin): one review per line, no ratings.
  --json prints the full result instead of a table.`)
  process.exit(file ? 0 : 1)
}

const readStdin = async () => { let data = ''; for await (const chunk of process.stdin) data += chunk; return data }

try {
  const input = file === '-' ? await readStdin() : await readFile(file, 'utf8')
  const result = analyze(/\.csv$/i.test(file) ? parseReviewCsv(input) : parsePasted(input))
  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    const pct = value => `${Math.round(value * 100)}%`
    console.log(`${result.total} reviews read, ${result.complaintReviews} named at least one complaint theme (${result.methodVersion})`)
    if (result.rated) console.log(`${result.highRatedComplaints} of those complaint reviews gave 4 or 5 stars`)
    if (result.smallSample) console.log('Small sample: fewer than 20 reviews, read the counts as a hint only')
    console.log('')
    const width = Math.max(...result.themes.map(theme => theme.label.length))
    for (const theme of result.themes) console.log(`${theme.label.padEnd(width)}  ${String(theme.count).padStart(4)}  ${pct(theme.share).padStart(4)}`)
  }
} catch (error) {
  console.error(`complaint-spotter: ${error.message}`)
  process.exit(1)
}
