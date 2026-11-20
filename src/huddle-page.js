import { analyze, parsePasted } from './analyze.js'
import { parseReviewCsv } from './csv.js'
import { copyHuddleText, mountHuddleEditor } from './huddle-editor.js'

const byId = id => document.getElementById(id)
const reviewForm = byId('rh-input')
const paste = byId('rh-reviews')
const fileInput = byId('rh-file')
const output = byId('rh-output')
const status = byId('rh-input-status')
const maxBytes = 300 * 1024
const maxRows = 200
let selectedFile = null
let clearEditor = () => {}
let revision = 0

function setFile(file) {
  revision++
  selectedFile = file
  byId('rh-file-name').textContent = file?.name || ''
  byId('rh-file-group').hidden = !file
  byId('rh-paste-group').hidden = !!file
  byId('rh-file-select').textContent = file ? 'Choose another CSV' : 'Choose CSV file'
  status.textContent = ''
  if (!file) fileInput.value = ''
}

export function startHuddleFromModel(model) {
  clearEditor()
  reviewForm.hidden = true
  output.hidden = false
  clearEditor = mountHuddleEditor(byId('rh-card-host'), model)
  const heading = output.querySelector('[data-huddle-heading]')
  heading?.focus()
}

byId('rh-file-select').addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0])
})
byId('rh-remove-file').addEventListener('click', () => {
  setFile(null)
  paste.focus()
})
paste.addEventListener('input', () => {
  revision++
  status.textContent = ''
})
reviewForm.addEventListener('submit', async event => {
  event.preventDefault()
  const ticket = ++revision
  status.textContent = ''
  try {
    const file = selectedFile
    if ((file ? file.size : new Blob([paste.value]).size) > maxBytes) {
      throw new Error('Use a batch smaller than 300 KiB.')
    }
    if (!file && !paste.value.trim()) {
      paste.focus()
      throw new Error('Paste a review or choose a CSV file to begin.')
    }
    const items = file ? parseReviewCsv(await file.text()) : parsePasted(paste.value).filter(item => item.text.trim())
    if (ticket !== revision) return
    if (items.length > maxRows) throw new Error('Use up to 200 reviews from one location at a time.')
    const model = analyze(items)
    if (!model.total) throw new Error('Include a review with at least 20 characters so there is enough text to check.')
    if (!model.themes.some(theme => theme.count > 0)) {
      throw new Error('No complaint themes matched this batch. Try other reviews from the same location.')
    }
    startHuddleFromModel(model)
  } catch (error) {
    if (ticket === revision) status.textContent = error.message || 'The reviews could not be read.'
  }
})
byId('rh-change').addEventListener('click', () => {
  revision++
  clearEditor()
  output.hidden = true
  reviewForm.hidden = false
  status.textContent = ''
  if (selectedFile) byId('rh-file-select').focus()
  else paste.focus()
})
const cleanUrl = new URL(location.href)
cleanUrl.search = ''
cleanUrl.hash = ''
const linkButton = byId('rh-copy-link')
if (location.protocol === 'file:' || location.protocol === 'chrome-extension:') {
  linkButton.hidden = true
  const download = byId('rh-download')
  download.href = location.protocol === 'file:' ? cleanUrl.href : globalThis.chrome.runtime.getURL('downloads/review-huddle.html')
  download.hidden = false
} else {
  if (/^\/tools\/review-huddle(?:\.html|\/)?$/.test(cleanUrl.pathname)) cleanUrl.pathname = '/tools/review-huddle'
  linkButton.addEventListener('click', async () => {
    const copied = await copyHuddleText(cleanUrl.href)
    byId('rh-link-status').textContent = copied ? 'Tool link copied.' : cleanUrl.href
  })
}

if (window.location.protocol === 'chrome-extension:' && globalThis.chrome?.runtime?.sendMessage) {
  globalThis.chrome.runtime.sendMessage({ type: 'take-huddle' }).then(model => {
    if (model) startHuddleFromModel(model)
  }).catch(() => { /* Direct visits can start with the review input. */ })
}
