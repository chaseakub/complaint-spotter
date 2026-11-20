import { huddleThemes, makeHuddle, formatHuddle } from './huddle.js'

function element(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

function button(text, className, onClick) {
  const node = element('button', className, text)
  node.type = 'button'
  node.addEventListener('click', onClick)
  return node
}

export async function copyHuddleText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* Some browsers allow selection copying only. */ }
  const previousFocus = document.activeElement
  const input = element('textarea', 'rh-clipboard')
  input.value = text
  input.readOnly = true
  document.body.append(input)
  input.select()
  try { return Boolean(document.execCommand('copy')) } catch { return false }
  finally {
    input.remove()
    previousFocus?.focus?.({ preventScroll: true })
  }
}

const fields = [
  { key: 'title', label: 'Card title', tag: 'input' },
  { key: 'action', label: 'What to check', tag: 'textarea' },
  { key: 'followUp', label: 'Who will follow up and when?', tag: 'textarea' },
  { key: 'recognition', label: 'Team shout-out (optional)', tag: 'input' },
]

function paper(card, editing = false) {
  const sheet = element('article', 'rh-paper')
  const heading = element('h2', 'rh-card-title', card.title.trim() || 'Pre-shift huddle')
  const stripe = element('div', 'rh-card-label', 'Pre-shift huddle')
  heading.tabIndex = -1
  heading.dataset.huddleHeading = ''
  sheet.append(stripe, heading, element('p', 'rh-evidence', card.evidence))
  if (editing) {
    const editFields = element('div', 'rh-card-fields')
    for (const field of fields) {
      const label = element('label', 'rh-edit-field')
      const control = element(field.tag)
      if (field.tag === 'textarea') control.rows = 2
      else control.type = 'text'
      control.value = card[field.key] || ''
      control.addEventListener('input', () => {
        card[field.key] = control.value
        if (field.key === 'title') heading.textContent = control.value.trim() || 'Pre-shift huddle'
      })
      label.append(element('span', '', field.label), control)
      editFields.append(label)
    }
    sheet.append(editFields)
  } else {
    for (const [key, label] of [['action', 'What to check'], ['followUp', 'Follow-up'], ['recognition', 'Team shout-out']]) {
      const text = (card[key] || '').trim()
      if (!text) continue
      const section = element('section', 'rh-point')
      section.append(element('h3', '', label), element('p', '', text))
      sheet.append(section)
    }
  }
  return sheet
}

const activeEditors = new WeakMap()

export function mountHuddleEditor(container, model) {
  activeEditors.get(container)?.()
  const root = element('section', 'rh-editor')
  root.setAttribute('aria-label', 'Review huddle card')
  container.replaceChildren(root)
  const themes = huddleThemes(model)
  if (!themes.length) {
    root.textContent = 'No complaint themes matched this batch.'
    return () => root.remove()
  }
  const drafts = new Map()
  let themeId = themes[0].id
  let editing = false
  let printSheet = null
  const current = () => {
    if (!drafts.has(themeId)) drafts.set(themeId, makeHuddle(model, themeId))
    return drafts.get(themeId)
  }
  const status = element('p', 'rh-status')
  status.setAttribute('role', 'status')
  const manualCopy = element('textarea', 'rh-manual-copy')
  manualCopy.readOnly = true
  manualCopy.setAttribute('aria-label', 'Text to copy')
  manualCopy.hidden = true
  const clearFeedback = () => {
    status.textContent = ''
    manualCopy.hidden = true
    manualCopy.value = ''
  }
  const copy = async (text, success) => {
    clearFeedback()
    if (await copyHuddleText(text)) {
      status.textContent = success
    } else {
      status.textContent = 'Select and copy the text below.'
      manualCopy.value = text
      manualCopy.hidden = false
      manualCopy.focus()
      manualCopy.select()
    }
  }
  function clearPrint() {
    if (!printSheet) return
    printSheet.remove()
    document.body.classList.remove('rh-printing')
    printSheet = null
  }
  function preparePrint() {
    // The host hides its web form in print media. The browser can apply that
    // stylesheet before firing beforeprint, so screen geometry is unreliable.
    if (!root.isConnected || root.closest('[hidden]') || printSheet) return
    printSheet = paper(current())
    printSheet.classList.add('rh-print-page')
    document.body.append(printSheet)
    document.body.classList.add('rh-printing')
  }
  const toolbar = element('div', 'rh-toolbar')
  if (themes.length > 1) {
    const label = element('label', 'rh-theme')
    label.append(element('span', '', 'Huddle focus'))
    const select = element('select')
    for (const theme of themes) {
      const option = element('option', '', theme.label)
      option.value = theme.id
      select.append(option)
    }
    select.addEventListener('change', () => {
      themeId = select.value
      editing = false
      redraw()
    })
    label.append(select)
    toolbar.append(label)
  }
  const editorBody = element('div')
  const edit = button('Edit card', 'rh-secondary', () => {
    editing = !editing
    redraw()
    if (editing) editorBody.querySelector('input').focus()
  })
  function redraw() {
    edit.textContent = editing ? 'Done editing' : 'Edit card'
    edit.setAttribute('aria-pressed', String(editing))
    editorBody.replaceChildren(paper(current(), editing))
    clearFeedback()
  }
  toolbar.append(edit)
  const actions = element('div', 'rh-actions')
  actions.append(
    button('Copy huddle', 'rh-primary', () => copy(formatHuddle(current()), 'Huddle copied.')),
    button('Print card', 'rh-secondary', () => {
      preparePrint()
      window.print()
    })
  )
  const handoff = element('details', 'rh-handoff')
  handoff.append(element('summary', '', 'Have Rex follow up'))
  const instructions = element('p', '', 'Paste the request in Rex to choose an owner and confirm.')
  const rexActions = element('div', 'rh-rex-actions')
  const openRex = element('a', 'rh-text', 'Open Rex ↗')
  openRex.href = 'https://app.repliohq.com/?page=rex#/rex'
  openRex.target = '_blank'
  openRex.rel = 'noopener noreferrer'
  rexActions.append(button('Copy request', 'rh-secondary', () => {
    const prompt = 'Help me assign this shift check and follow up. Confirm the owner and timing with me.\n\n' + formatHuddle(current())
    copy(prompt, 'Request copied. Open Rex and paste it into the conversation.')
  }), openRex)
  handoff.append(instructions, rexActions)
  root.append(toolbar, editorBody, actions, status, manualCopy, handoff)
  window.addEventListener('beforeprint', preparePrint)
  window.addEventListener('afterprint', clearPrint)
  const cleanup = () => {
    window.removeEventListener('beforeprint', preparePrint)
    window.removeEventListener('afterprint', clearPrint)
    clearPrint()
    root.remove()
    activeEditors.delete(container)
  }
  activeEditors.set(container, cleanup)
  redraw()
  return cleanup
}
