# Complaint Spotter

Count which complaints keep coming back in a restaurant's reviews, at every star rating.

Two ways to run the same open rules:

- **Chrome extension**: reads the reviews on a Google Maps or Yelp page you have open.
- **Command line**: reads a CSV or text file of reviews you exported.

Nothing is uploaded. There are no network requests, no storage and no tracking.

```text
$ node bin/complaint-spotter.mjs examples/sample-reviews.csv
24 reviews read, 18 named at least one complaint theme (food-drink-rules-1.0)
4 of those complaint reviews gave 4 or 5 stars

Wrong or missing items              7   29%
Slow service or long waits          4   17%
Cold food or hot drinks             3   13%
Rude or dismissive service          2    8%
Cleanliness concerns                2    8%
Delivery timing or handling         2    8%
Allergy or food safety concerns     1    4%
```

## Why count complaints at every rating

Most teams read the one and two star reviews and skim the rest. In the [2026 Replio case study](https://www.repliohq.com/reports/restaurant-review-complaints-2026) of 2,365 reviews from eight restaurants, 71 of the 333 reviews that named a real problem were rated four or five stars. A "great food, but my order was missing the fries again" review is easy to miss and is often the most useful one.

## Command line

Needs Node.js 20 or newer. No install step and no dependencies.

```sh
git clone https://github.com/chaseakub/complaint-spotter.git
cd complaint-spotter
node bin/complaint-spotter.mjs examples/sample-reviews.csv
node bin/complaint-spotter.mjs my-reviews.csv --json > result.json
node bin/complaint-spotter.mjs reviews.txt        # one review per line, no ratings
pbpaste | node bin/complaint-spotter.mjs -        # read from stdin
```

CSV format:

| Column | Required | Accepted names |
|---|---|---|
| Review text | yes | `text`, `review`, `review_text` |
| Star rating 1 to 5 | no | `rating`, `stars`, `star_rating` |

Quoted fields, commas and line breaks inside reviews are supported. Malformed CSV is rejected with a message rather than read into the wrong column.

## Chrome extension

1. Download or clone this repo.
2. Open `chrome://extensions` and turn on Developer mode.
3. Click **Load unpacked** and choose the repo folder.
4. Open a restaurant on Google Maps, click **Reviews**, scroll to load more, then click the Complaint Spotter icon.

It also works on highlighted text on any page, or on reviews pasted into the popup, one per line.

Permissions: `activeTab` and `scripting` only, used after you click the icon. No host permissions.

## The themes

| Theme | Example phrases it counts |
|---|---|
| Wrong or missing items | "missing fries", "order was wrong", "forgot my sauce" |
| Slow service or long waits | "slow drive thru", "long wait", "waited too long" |
| Cold food or hot drinks | "cold fries", "coffee was lukewarm", "food wasn't hot" |
| Rude or dismissive service | "rude cashier", "manager was dismissive", "ignored us" |
| Cleanliness concerns | "sticky table", "restroom was dirty", "hair in my food" |
| Allergy or food safety concerns | "allergic reaction", "undercooked chicken", "allergy ignored" |
| Delivery timing or handling | "late delivery", "delivery never arrived", "driver went to the wrong address" |

The full patterns are in [`src/rules.js`](src/rules.js). They are plain regular expressions you can read, test and change.

## How counting works

- Each review counts once per theme, however many times it repeats the phrase.
- Simple negations are skipped: "the food was not cold" and "service was never slow" do not count.
- Exact duplicate reviews and fragments under 20 characters are dropped.
- Under 20 reviews, the result is flagged as a small sample.
- Every result carries a method version (`food-drink-rules-1.0`) so counts from different runs can be compared.

## Limits

- English phrases about food and drink only.
- Keyword rules, not language understanding. Sarcasm and unusual wording will be missed.
- Themes overlap, and a review with no match is not necessarily positive.
- The extension reads only the reviews loaded on screen, not a business's full history.
- Google and Yelp change their page markup. If the extension returns nothing, check the selectors in `src/extract.js`.

Check the original reviews before acting on a count.

## Develop

```sh
npm install          # Playwright, for the browser tests only
npx playwright install chromium
npm test             # rules, CSV parser, CLI, extractor fixtures, and the real extension in Chromium
npm run package      # zip for the Chrome Web Store
```

The rules are shared with the [Complaint Pattern Finder](https://www.repliohq.com/tools/complaint-pattern-finder) on repliohq.com, so the web tool, the extension and the command line count the same way. If you change a pattern, add a test in `test/` that shows the review it should and should not count.

Issues and pull requests are welcome, especially new phrases you see in real reviews and non-English rule sets.

## Who made this

Built by [Replio](https://www.repliohq.com), which helps restaurant and multi-location teams give each repeat complaint an owner, a due date and a check that it stopped. This tool is free and works without a Replio account.
