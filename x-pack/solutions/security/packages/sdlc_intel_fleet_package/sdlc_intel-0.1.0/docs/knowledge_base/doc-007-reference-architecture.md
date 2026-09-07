# DOC-007 · Reference Architecture: Packaged Multi-Source ETL on Kibana

The architecture proven by the SDLC Visibility Platform dogfood (3,000 repos, 4 source systems, zero custom Kibana code).

```
┌─────────────┐   GraphQL cursors   ┌──────────────────────────────────┐
│ GitHub      ├────────────────────►│ Workflows (stock steps)          │
│ Slack       │   REST pagination   │  catalog · enrich · link · sync  │
│ Salesforce* │                     └───────┬──────────────────────────┘
│ GDrive*     │                             │ idempotent upserts
└─────────────┘                             ▼
                            ┌──────────────────────────────┐
                            │ Elasticsearch corpus         │
                            │  github-intel-*  slack-intel-*│
                            │  semantic_text (ELSER)       │
                            │  ILM: hot 30d → delete 90d   │
                            └──┬───────────┬───────────┬───┘
                               │           │           │
              transforms ──────┘           │           └──── alerts (4 rules
              (freshness, dims)            │                    → Slack)
                                           ▼
                              ┌──────────────────────────┐
                              │ Agent Builder            │
                              │  sdlc.* tools (8)        │
                              │  agents · MCP namespace  │
                              └──────────────────────────┘
* creds-gated
```

## Layers

1. **Ingest** — action-connectors + cursor workflows. Raw fidelity in `payload.*`, normalized top-level fields. Backfill falls out of design: first run starts `cursor: ''`.
2. **Corpus** — per-entity indices with index templates; ELSER `semantic_text` on text bodies (19.3k docs embedded, 0 failures); ILM lifecycle with lookup-index exemptions.
3. **Derived** — continuous transforms: freshness (monitoring), team dimension, pr-issue links, unified people (26% identity match — structural ceiling).
4. **Consumption** — ES|QL views/dashboards; alert rules (ingest-health + delivery-risk) → Slack; Agent Builder agents + MCP tools for conversational access.

## Why this shape

- **Everything is a package asset** → installs into any compatible Kibana; no fork.
- **Cursor sync + idempotent writes** → crash-safe, resumable, self-healing backfills.
- **Monitoring is data, not hope** — freshness transform + stall alert caught real outages.
- **Honest ML** — anomaly detection on ingest cadence complements fixed thresholds; identity resolution reports its true match rate.

## Scale numbers (dogfood, one M1 Max)

15.6k issues · 13.8k PRs · 58.5k project items · 11.9k Slack msgs · 2.4M workflow exec-log docs · 21 freshness-monitored sources · public endpoint ~0.12s.

## Known platform gaps (owned by plugin teams, Epic 1–4 tickets)

Var re-substitution on update; workflow checkpoint/bulk/rate-limit primitives as first-class steps; `REPLACE_WITH_FLEET_AGENT_*`; agents read-only in UI. Track in Project 2511.
