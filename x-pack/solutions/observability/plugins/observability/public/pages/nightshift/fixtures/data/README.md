# Fixture Data

This directory contains JSON fixture data for the Nightshift investigation prototype.
The data is sourced from an internal Elastic cluster and is **not committed to git**.

## Required files

- `streams.json` — Stream definitions
- `features.json` — Knowledge Indicator entities and dependencies
- `queries.json` — Monitoring queries
- `detections.json` — Change-point detections
- `discoveries.json` — Rich discoveries
- `significant_events.json` — Significant events
- `investigations.json` — Investigations (currently empty)

## Getting the data

Download the fixture archive from the private repo release:

```bash
cd x-pack/solutions/observability/plugins/observability/public/pages/nightshift/fixtures/data
gh release download fixtures --repo elastic/observability-dev --pattern "*.zip"
unzip -o nightshift-fixtures.zip && rm nightshift-fixtures.zip
```

You need access to the `elastic/observability-dev` repo (ask the RNA team if you don't have it).

## Updating the data

After modifying fixture JSON files locally:

```bash
cd x-pack/solutions/observability/plugins/observability/public/pages/nightshift/fixtures/data
zip nightshift-fixtures.zip *.json
gh release upload fixtures nightshift-fixtures.zip --repo elastic/observability-dev --clobber
```
