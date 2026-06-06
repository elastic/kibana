# Error Sentry (`errorSentry`)

Kibana-native port of [Kibana Error Sentry](https://github.com/elastic/kibana-error-sentry):
detect recurring log error patterns and track them as GitHub issues, orchestrated with
**Workflows** (and, later, **Agent Builder** agents).

This is the first vertical slice (Phase 0): a scheduled workflow that runs the `categorize_text`
aggregation and opens a GitHub issue per recurring pattern.

## UI

Registers an **Error Sentry** app (left nav, Observability category, `/app/errorSentry`):

- Header **Error Sentry** with a **Trigger workflow** button (runs the capture workflow).
- A list of detected patterns (the open Error Sentry cases). Each item shows the pattern title +
  severity and three actions: **Investigate**, **Fix**, **Close**.
  - Investigate posts a comment on the case (placeholder for the Detective agent).
  - Fix opens the **Agent Builder** chat sidebar on the **Code Researcher** agent (matched by name
    via `agentBuilder.agents.list()`) with an auto-sent prompt describing the pattern/case
    (`agentBuilder.openChat({ agentId, initialMessage, autoSendInitialMessage: true })`). Falls back
    to a comment when Agent Builder isn't available.
  - Close closes the case and removes it from the list.

## What it registers

- **Custom workflow steps** (via `workflowsExtensions`):
  - `error-sentry.collectLogPatterns` — runs the Elasticsearch `categorize_text` aggregation over
    an index/data stream and returns the recurring patterns. Supports `logLevels` (filter to e.g.
    `ERROR`/`FATAL`) and `samplingProbability` (wrap in `random_sampler` for busy/broad indices;
    counts are auto-scaled by `1/probability`).
  - `error-sentry.createGithubIssue` — creates a GitHub issue via the REST API. No-op (reports
    `skipped: true`) when no token is configured.
- **Workflow** `error-sentry-capture` — created on plugin start as a normal (unmanaged) workflow so
  it shows in the Workflows app list and can be browsed / run / edited. Scheduled trigger →
  `collectLogPatterns` → `foreach` → `createGithubIssue`. Creation is idempotent (skipped if it
  already exists in the default space).

## Configuration

```yaml
# kibana.dev.yml
errorSentry:
  github:
    apiToken: 'ghp_...'        # optional; without it the create-issue step is a safe no-op
    owner: 'elastic'
    repo: 'observability-error-backlog'
```

Prefer the keystore for the token in real deployments:
`bin/kibana-keystore add errorSentry.github.apiToken`.

## Trying it locally

1. `yarn kbn bootstrap`
2. Start Kibana (Workflows + an Enterprise/trial license required).
3. Open **Workflows** (`/app/workflows`) → find **Error Sentry - Capture log error patterns**.
4. Edit the `index` in the workflow YAML to a real index, then **Run** it (or rely on the schedule).

## Status / next steps

- Promote collection logic (ownership resolution, issue templating, trace enrichment) from the
  standalone tracker into the `collectLogPatterns` step / additional steps.
- Add Detective / Librarian as Agent Builder agents and invoke them from workflows via the
  `agent-builder.runAgent` step.
- Replace the direct GitHub REST call with a connector when a first-class GitHub connector exists.
