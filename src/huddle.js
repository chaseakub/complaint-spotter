// The card carries counts from the selected batch and a check the manager can edit.
const checks = {
  wrong_order: {
    title: 'Order accuracy',
    finding: 'wrong or missing items',
    action: 'At pickup, match each bag to the ticket before handing it over. Check sides, sauces and drinks.',
    followUp: 'After the rush, ask the pickup lead what they caught at handoff.',
  },
  cold_food: {
    title: 'Food temperature',
    finding: 'food or drink temperature',
    action: 'Watch one order from the kitchen to pickup. Check where ready items wait before handoff.',
    followUp: 'After the rush, ask the shift lead where ready orders waited.',
  },
  slow_service: {
    title: 'Wait times',
    finding: 'slow service or long waits',
    action: 'Follow one order during the rush. Note where the guest waits longest.',
    followUp: 'After the rush, ask the shift lead which step held up the order.',
  },
  staff_conduct: {
    title: 'Guest interactions',
    finding: 'rude or dismissive service',
    action: 'At the counter, acknowledge waiting guests and give them a clear next step.',
    followUp: 'After service, ask the floor lead what they noticed during a guest interaction.',
  },
  cleanliness: {
    title: 'Cleanliness',
    finding: 'cleanliness concerns',
    action: 'Walk the guest areas before service. Check the entry, tables and restrooms with the floor lead.',
    followUp: 'Ask the floor lead which area needed attention and who checked it again.',
  },
  delivery: {
    title: 'Delivery handoff',
    finding: 'delivery timing or handling',
    action: 'Walk one delivery order from packing to pickup. Check the label, staging spot and handoff.',
    followUp: 'After the rush, ask the packing lead what happened at pickup.',
  },
  allergy_safety: {
    title: 'Food safety concerns',
    finding: 'allergy or food safety concerns',
    action: 'Bring the concern to the manager on duty immediately and follow the restaurant’s established safety procedure.',
    followUp: 'Have the manager on duty confirm the required steps and record the follow-up.',
  },
}

export function huddleThemes(model) {
  if (!Number.isSafeInteger(model?.total) || model.total < 1 || !Array.isArray(model.themes)) return []
  return model.themes
    .filter(theme => theme && Object.hasOwn(checks, theme.id) && Number.isSafeInteger(theme.count) && theme.count > 0 && theme.count <= model.total)
    .sort((a, b) => b.count - a.count)
}

export function makeHuddle(model, themeId) {
  const theme = huddleThemes(model).find(item => item.id === themeId)
  if (!theme) return null
  const {title, finding, action, followUp} = checks[theme.id]
  const unit = model.total === 1 ? 'review' : 'reviews'
  const verb = theme.count === 1 ? 'mentions' : 'mention'
  let evidence = `${theme.count} of ${model.total} ${unit} in this batch ${verb} ${finding}.`
  if (Number.isSafeInteger(theme.highRatedCount) && theme.highRatedCount > 0 && theme.highRatedCount <= theme.count) {
    const ratingVerb = theme.highRatedCount === 1 ? 'was' : 'were'
    evidence += ` ${theme.highRatedCount} ${ratingVerb} rated 4 or 5 stars.`
  }
  return {title, evidence, action, followUp, recognition: ''}
}

export function formatHuddle(card) {
  return [
    card.title,
    card.evidence,
    card.action?.trim() && `Today's check\n${card.action.trim()}`,
    card.followUp?.trim() && `Follow-up\n${card.followUp.trim()}`,
    card.recognition?.trim() && `Recognition\n${card.recognition.trim()}`,
  ].filter(value => value?.trim()).map(value => value.trim()).join('\n\n')
}

// Only the displayed card crosses into Rex. Browser fragments stay out of HTTP requests.
export function rexHuddleUrl(card, themeId) {
  if (!Object.hasOwn(checks, themeId)) throw new Error('Choose a huddle focus first.')
  const fields = [
    ['title', 'Card title', 160], ['evidence', 'Review count', 650],
    ['action', 'What to check', 1200], ['followUp', 'Follow-up', 1000],
    ['recognition', 'Team shout-out', 450],
  ]
  const draft = { v: 1, themeId }
  for (const [key, label, limit] of fields) {
    const value = (card[key] || '').trim()
    if (value.length > limit) throw new Error(`Edit the card to keep “${label}” under ${limit + 1} characters.`)
    draft[key] = value
  }
  draft.title ||= 'Pre-shift huddle'
  if (!draft.action) throw new Error('Edit the card and add what the team should check.')
  if (!draft.evidence) throw new Error('Choose a focus with matching reviews first.')
  const bytes = new TextEncoder().encode(JSON.stringify(draft))
  if (bytes.length > 8192) throw new Error('Shorten the card before opening it in Rex.')
  const encoded = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  return 'https://app.repliohq.com/?page=rex#/rex/review-huddle?card=' + encoded
}
