// Transfer just the counts to the editor. A new tab keeps edits and printing
// independent of the popup's short lifetime. No permissions or persistence needed.
const pending = new Map()
const popup = chrome.runtime.getURL('src/popup.html')
const editor = chrome.runtime.getURL('index.html')

chrome.tabs.onRemoved.addListener(id => pending.delete(id))

chrome.runtime.onMessage.addListener((request, sender, respond) => {
  if (request?.type === 'take-huddle' && sender.url === editor && sender.tab) {
    const model = pending.get(sender.tab.id)
    pending.delete(sender.tab.id)
    respond(model || null)
    return false
  }
  if (request?.type !== 'open-huddle' || sender.url !== popup) return false
  openEditor(request.model).then(() => respond(true), () => respond(false))
  return true
})

async function openEditor(model) {
  const tab = await chrome.tabs.create({url: 'about:blank', active: false})
  pending.set(tab.id, model)
  try {
    await chrome.tabs.update(tab.id, {url: editor, active: true})
  } catch (error) {
    pending.delete(tab.id)
    await chrome.tabs.remove(tab.id).catch(() => {})
    throw error
  }
}
