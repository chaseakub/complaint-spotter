# Examples

`sample-reviews.csv` holds 24 example reviews written for this repo. They are not real customer reviews and do not describe any business.

```sh
node bin/complaint-spotter.mjs examples/sample-reviews.csv
node bin/complaint-spotter.mjs examples/sample-reviews.csv --json > result.json
```

To try your own reviews, export them to a CSV with a `review_text` (or `text`, `review`) column and an optional `rating` (or `stars`, `star_rating`) column.
