# DOC-005 · GitHub Action-Connector vs Content-Connector: Decision Guide

Kibana offers two ways to ingest GitHub. Choose by **breadth vs control**:

## Use the action-connector (`.github`, isTool:true) when…

- You need **GraphQL breadth**: projects/v2 items, views, relationships, teams — anything beyond issues/PRs the content source doesn't cover.
- You want **workflow-orchestrated transforms** between fetch and index (enrichment, linking, identity resolution).
- Incremental sync with exact cursors matters (no missed windows).

Cost: you author the ETL (workflows, index templates, transforms) — this is the model the SDLC intel package uses: 30 workflows, 20+ indices, 58k project items.

## Use the content connector (GitHub content source) when…

- You need plain **issues + PRs + files** into an Elasticsearch index fast, with managed scheduling and the built-in UI.
- Minimal ops surface; no custom mappings beyond the connector's own.

Cost: no projects/v2, no cross-source joins, no ETL transforms; sync semantics are the connector's, not yours.

## Decision table

| Need | Action-connector ETL | Content connector |
|---|---|---|
| Issues/PRs text | ✅ | ✅ |
| GitHub Projects/v2 | ✅ | ❌ |
| Cross-source identity joins (Slack↔GitHub) | ✅ | ❌ |
| Custom index schemas / semantic_text | ✅ | mapping-only |
| Zero authoring effort | ❌ | ✅ |
| Semantic search (ELSER) on corpus | ✅ (backfill via update_by_query) | partial |

**Rule of thumb:** content connector for reading a repo; action-connector ETL the moment you're asking *analytical* questions across sources.

## Production evidence

The visibility platform runs the action-connector ETL on 3,000 repos: 15.6k issues, 13.8k PRs, 58.5k project items, 11.9k Slack messages joined — queries no content connector can answer.
