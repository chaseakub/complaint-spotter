// These two functions are injected into the page with chrome.scripting.executeScript,
// so each must be self-contained: no imports, no outside variables.

// Opens truncated reviews ("More") so the full text is on the page.
export function expandReviews() {
  const host = location.hostname
  const buttons = /(^|\.)google\.[a-z.]+$/.test(host)
    ? document.querySelectorAll('button.w8nwRe, button[aria-label="See more"]')
    : /(^|\.)yelp\.[a-z.]+$/.test(host)
      ? document.querySelectorAll('#reviews button[aria-expanded="false"], section[aria-label*="Reviews"] button[aria-expanded="false"]')
      : []
  let clicked = 0
  for (const button of buttons) {
    if (!/more/i.test(button.textContent || button.getAttribute('aria-label') || '')) continue
    try { button.click(); clicked += 1 } catch { /* a stale button is fine to skip */ }
  }
  return clicked
}

// Reads the reviews on screen. Returns { source, reviews: [{ text, rating }] }.
export function extractReviews() {
  const clean = value => (value || '').replace(/\s+/g, ' ').trim()
  const stars = label => {
    const match = /([1-5])(?:\.0)?\s*(?:stars?|star rating)/i.exec(label || '')
    return match ? Number(match[1]) : null
  }
  const selection = String(window.getSelection() || '').trim()
  if (selection.length >= 40) {
    return { source: 'selection', reviews: selection.split(/\n+/).map(text => ({ text: clean(text), rating: null })) }
  }
  const host = location.hostname
  const reviews = []
  if (/(^|\.)google\.[a-z.]+$/.test(host) && location.pathname.startsWith('/maps')) {
    for (const block of document.querySelectorAll('div[data-review-id]')) {
      // Google nests a review's blocks inside each other; read only the outermost one.
      if (block.parentElement?.closest('[data-review-id]')) continue
      const text = block.querySelector('.wiI7pd')
      if (!text) continue
      const rating = block.querySelector('[role="img"][aria-label*="star" i]')
      reviews.push({ text: clean(text.innerText), rating: stars(rating?.getAttribute('aria-label')) })
    }
    return { source: 'google', reviews }
  }
  if (/(^|\.)yelp\.[a-z.]+$/.test(host) && location.pathname.startsWith('/biz/')) {
    const container = document.querySelector('#reviews') || document.querySelector('section[aria-label*="Reviews"]') || document
    for (const item of container.querySelectorAll('li')) {
      const text = item.querySelector('p[class*="comment"] span[lang], p[class*="comment"], span[lang]')
      if (!text) continue
      const rating = item.querySelector('[role="img"][aria-label*="star rating" i]')
      reviews.push({ text: clean(text.innerText), rating: stars(rating?.getAttribute('aria-label')) })
    }
    return { source: 'yelp', reviews }
  }
  return { source: 'unsupported', reviews }
}
