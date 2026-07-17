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

Ask the team for access to the fixture data JSON files, or run the data extraction
script against a Nightshift-enabled cluster (see the agent-threads workspace for
the extraction scripts used to generate these fixtures).
