// Vendored from replio-landing public/js/operator-tools-core.js @ 81c793f (THEMES, isNegated, matchedThemes).
// Keep in sync: the extension and the Complaint Pattern Finder must count the same way.
const THEMES = [
  { id: 'cold_food', label: 'Cold food or hot drinks', phrases: ['the food or drink temperature'], patterns: [
    /\b(?:cold|lukewarm|tepid)\s+(?:food|fries|meal|pizza|burger|soup|chicken|coffee|tea|dish|dinner|breakfast|lunch)\b/g,
    /\b(?:food|fries|meal|pizza|burger|soup|chicken|coffee|tea|dish)\b[^.!?;\n]{0,24}\b(?:cold|lukewarm|tepid)\b/g,
    /\b(?:food|fries|meal|coffee|tea)\b[^.!?;\n]{0,15}\b(?:not hot|wasn't hot|was not hot)\b/g,
  ] },
  { id: 'slow_service', label: 'Slow service or long waits', phrases: ['the wait for service'], patterns: [
    /\b(?:slow|sluggish)\s+(?:service|drive[ -]?thr(?:u|ough)|staff|servers?|checkout)\b/g,
    /\b(?:service|drive[ -]?thr(?:u|ough)|checkout)\b[^.!?;\n]{0,20}\b(?:slow|sluggish)\b/g,
    /\b(?:long|lengthy|excessive|ridiculous)\s+(?:wait|queue|line)\b/g,
    /\b(?:waited|waiting|wait)\s+(?:far\s+)?too long\b/g,
    /\b(?:waited|waiting)\s+(?:forever|an hour|hours)\b/g,
  ] },
  { id: 'wrong_order', label: 'Wrong or missing items', phrases: ['the order accuracy'], patterns: [
    /\b(?:wrong|incorrect|missing)\s+(?:order|items?|food|drink|sauce|side|fries|burger|sandwich)\b/g,
    /\b(?:order|items?|drink|sauce|side|fries|burger|sandwich)\b[^.!?;\n]{0,18}\b(?:missing|wrong|incorrect)\b/g,
    /\b(?:forgot|forgotten|left out)\s+(?:(?:my|our|the|a)\s+)?(?:items?|drink|sauce|side|fries|burger|sandwich)\b/g,
  ] },
  { id: 'staff_conduct', label: 'Rude or dismissive service', phrases: ['the way the interaction was handled'], patterns: [
    /\b(?:rude|dismissive|disrespectful|unfriendly)\s+(?:staff|server|waiter|waitress|cashier|manager|service|employee)\b/g,
    /\b(?:staff|server|waiter|waitress|cashier|manager|employee)\b[^.!?;\n]{0,20}\b(?:rude|dismissive|disrespectful|unfriendly)\b/g,
    /\b(?:ignored us|ignored me|yelled at us|yelled at me)\b/g,
  ] },
  { id: 'cleanliness', label: 'Cleanliness concerns', phrases: ['the cleanliness concern'], patterns: [
    /\b(?:dirty|filthy|sticky|unclean)\s+(?:tables?|floor|bathroom|restroom|utensils|cutlery|restaurant|kitchen)\b/g,
    /\b(?:tables?|floor|bathroom|restroom|utensils|cutlery|restaurant|kitchen)\b[^.!?;\n]{0,18}\b(?:dirty|filthy|sticky|unclean)\b/g,
    /\b(?:hair in (?:my|the|our) food|roaches|cockroaches)\b/g,
  ] },
  { id: 'allergy_safety', label: 'Allergy or food safety concerns', phrases: ['the safety concern'], patterns: [
    /\b(?:allergic reaction|food poisoning|undercooked chicken|raw chicken)\b/g,
    /\b(?:allergy|allergies|allergen)\b[^.!?;\n]{0,25}\b(?:ignored|dismissed|unsafe|not taken seriously)\b/g,
    /\b(?:ignored|dismissed)\s+(?:(?:my|our|the)\s+)?(?:allergy|allergies)\b/g,
    /\b(?:nuts|peanuts|dairy|gluten)\b[^.!?;\n]{0,18}\bdespite\b[^.!?;\n]{0,18}\ballergy\b/g,
  ] },
  { id: 'delivery', label: 'Delivery timing or handling', phrases: ['the delivery experience'], patterns: [
    /\b(?:late|delayed|spilled|damaged)\s+(?:delivery|delivery order)\b/g,
    /\bdelivery\b[^.!?;\n]{0,20}\b(?:late|delayed|spilled|damaged|never arrived)\b/g,
    /\b(?:delivery|driver)\b[^.!?;\n]{0,20}\b(?:wrong address|wrong house)\b/g,
  ] },
]

function isNegated(text, match) {
  // Short clauses only. This deliberately errs toward excluding a suspected
  // negation; it is a transparent keyword aid, not semantic understanding.
  const before = text.slice(Math.max(0, match.index - 45), match.index).split(/[.!?;\n]|\bbut\b|\bhowever\b/).at(-1)
  const value = match[0]
  if (/\bnot only\s*$/.test(before)) return false
  if (/\b(?:no|without)\s+(?:(?:issues?|problems?|complaints?|trouble)\s+(?:with|about)\s+)?(?:any\s+)?$/.test(before)) return true
  if (/\b(?:not|never|wasn't|weren't|isn't|aren't)\s+(?:(?:really|very|actually|at all|longer|ever)\s+)*$/.test(before)) return true
  if (/\b(?:never|haven't|hadn't|didn't|don't|doesn't)\s+(?:(?:had|have|experience|experienced|encounter|encountered|receive|received|get|got)\s+)?(?:any\s+)?$/.test(before)) return true
  // "The food was not cold" and "service was never slow" match the
  // subject-to-adjective patterns. "Not hot" is intentionally a concern.
  return /\b(?:not|never|wasn't|weren't|isn't|aren't)\s+(?:at all\s+)?(?:cold|lukewarm|tepid|slow|sluggish|missing|wrong|incorrect|rude|dismissive|disrespectful|unfriendly|dirty|filthy|sticky|unclean|late|delayed|spilled|damaged)\b/.test(value)
}

function matchedThemes(review) {
  const text = review.toLowerCase().replace(/[’‘]/g, "'")
  return THEMES.filter(theme => theme.patterns.some(pattern => [...text.matchAll(pattern)].some(match => !isNegated(text, match))))
}

export const METHOD_VERSION = 'food-drink-rules-1.0'
export { THEMES, matchedThemes }
