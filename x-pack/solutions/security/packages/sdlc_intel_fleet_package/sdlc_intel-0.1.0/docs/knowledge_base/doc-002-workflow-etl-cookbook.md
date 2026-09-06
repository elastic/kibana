# DOC-002 · Workflow ETL Cookbook for Integration Packages

Recipes for stock-step ETL workflows — no custom step types required (the thesis of Epic 2, proven by 30 production workflows).

## Recipe: cursor-based incremental sync (GitHub issues)

```yaml
steps:
  - id: load-cursor
    action: github.runQueryTemplate
    params:
      template: |
        query($cursor: String) {
          repository(owner: "...", name: "...") {
            issues(first: 100, states: OPEN, after: $cursor) {
              pageInfo { hasNextPage endCursor }
              nodes { number title body updatedAt state url }
            }
          }
        }
  - id: upsert
    action: elasticsearch.index
    params:
      index: github-intel-issues
      documents: "{{ steps.load-cursor.nodes }}"
      documentId: "{{ node.id }}"
  - id: save-cursor
    action: workflow.state
    params:
      cursor: "{{ steps.load-cursor.pageInfo.endCursor }}"
```

Key points:
- **Cursors beat timestamps** — exact resume, no missed/duped windows (verified: fresh install backfills full history from `cursor: ''`).
- **Idempotent upserts keyed on entity id** — re-runs are safe (we saw version conflicts during concurrent backfill; `conflicts=proceed` + idempotent docs make it self-healing).
- **Concurrency guard**: one workflow instance per index — a second run under a held lock skips cleanly instead of racing.

## Recipe: cross-index enrichment (PR ↔ linked issue)

Scheduled workflow ES|QL-joins `github-intel-pull-requests` against issues; writes to `sdlc-pr-issue-links`. Output feeds the orphan-PR alert (DOC-006).

## Recipe: identity resolution (cross-source people)

Normalize names (`lower(trim)`), then email-prefix heuristics, into a unified index. Honest numbers from production: name-match 21%, email-prefix +5pts → 26% ceiling without an email-bearing source. Don't promise more.

## Recipe: freshness/health monitoring

Continuous transform aggregating per-source `doc_count` + `last_timestamp` into a rolling index (`vp-freshness-*`). One alert rule watches staleness (see `sdlc-ingest-stalled` template) — this caught real outages in dogfood.

## Anti-patterns (all bit us)

- Raw-API payloads written unmapped → dynamic-mapping poisoning; normalize on write, keep raw in a `payload` sub-object only.
- `NOW() - date_field` arithmetic in ES|QL → type error; use `DATE_DIFF("days", field, NOW())`.
- Alert POST-create with actions → actions silently dropped; create then PUT with the action block.
