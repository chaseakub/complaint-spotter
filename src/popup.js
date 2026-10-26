import { analyze, parsePasted } from './analyze.js'
import { expandReviews, extractReviews } from './extract.js'

const $ = id => document.getElementById(id)
const percent = value => `${Math.round(value * 100)}%`
const status = text => { $('status').textContent = text }

function render(result) {
  $('results').hidden = false
  $('r-total').textContent = result.total
  $('r-complaints').textContent = result.complaintReviews
  $('r-high').textContent = result.highRatedComplaints
  $('r-high-box').hidden = result.rated === 0
  $('r-small').hidden = !result.smallSample
  $('r-method').textContent = result.methodVersion
  const body = $('r-themes')
  body.replaceChildren(...result.themes.map(theme => {
    const row = document.createElement('tr')
    if (!theme.count) row.className = 'zero'
    for (const value of [theme.label, String(theme.count), percent(theme.share)]) {
      const cell = document.createElement('td')
      cell.textContent = value
      row.append(cell)
    }
    return row
  }))
}

function show(items, sourceLabel) {
  const result = analyze(items)
  if (!result.total) {
    $('results').hidden = true
    status('No reviews long enough to count. Open the reviews, scroll to load them, and try again.')
    return
  }
  status(`Read ${result.total} ${result.total === 1 ? 'review' : 'reviews'} ${sourceLabel}.`)
  render(result)
}

const SOURCES = { google: 'from Google Maps', yelp: 'from Yelp', selection: 'from your highlighted text' }

async function runOnPage() {
  const button = $('run')
  button.disabled = true
  status('Reading the reviews on this page...')
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) throw new Error('no tab')
    const target = { tabId: tab.id }
    await chrome.scripting.executeScript({ target, func: expandReviews })
    await new Promise(resolve => setTimeout(resolve, 500))
    const [{ result }] = await chrome.scripting.executeScript({ target, func: extractReviews })
    if (result.source === 'unsupported') {
      $('results').hidden = true
      status('Open a restaurant\'s reviews on Google Maps or Yelp, or highlight reviews on any page, then try again. You can also paste reviews below.')
      return
    }
    show(result.reviews, SOURCES[result.source])
  } catch {
    $('results').hidden = true
    status('This page cannot be read. Try a Google Maps or Yelp reviews page, or paste reviews below.')
  } finally {
    button.disabled = false
  }
}

$('run').addEventListener('click', runOnPage)
$('run-paste').addEventListener('click', () => show(parsePasted($('paste').value), 'from your paste'))
