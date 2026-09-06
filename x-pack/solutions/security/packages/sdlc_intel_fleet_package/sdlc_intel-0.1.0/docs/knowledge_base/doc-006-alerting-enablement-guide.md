# DOC-006 · Integration Alerting Templates Enablement Guide

How package alert templates become live, notified rules — the full install-to-Slack-DM path, verified end-to-end.

## 1. Declare vars

manifest.yml exposes what rules need:

```yaml
vars:
  - name: slack_connector_id
    type: text
    required: true
    description: Connector id of the pre-configured Slack connector
```

## 2. Ship rule templates (`kibana/alerting_rule_template/`)

Shape that survives install **and** later PUTs:

```json
{
  "name": "SDLC ingest stalled",
  "tags": ["sdlc_intel"],
  "schedule": { "interval": "1h" },
  "params": { "searchType": "esqlQuery", "esqlQuery": { "esql": "FROM vp-freshness-* | ..." }, "threshold": [2], ... },
  "actions": [{
    "id": "{{slack_connector_id}}",
    "group": "query matched",
    "params": { "subAction": "sendMessage", "messages": { "message": "{{context.message}} ({{context.value}}) {{context.date}}" } },
    "frequency": { "summary": false, "notify_when": "onActiveAlert", "throttle": null }
  }]
}
```

Gotchas (all live-verified):
- Only `name/tags/schedule/params/actions` are PUTtable. `id`, `rule_type_id`, `consumer`, `scheduled_at` are read-only — echoing them back → 400.
- `subAction` camelCase; `notify_when` snake_case. Same payload, both conventions.
- `frequency` is mandatory on every action PUT, even unchanged.
- `{{context.source}}` renders empty in Slack; use `message`/`value`/`date`.

## 3. Enable & verify

1. Enable each rule (they install disabled).
2. **Mutation-test**: age/manipulate the source condition, watch the action fire, restore. A rule that has never fired is unverified.
3. Check `execution_status.status` goes `ok`/`active` within one schedule interval — an `error` with a stuck `last_execution_date` means either an ES|QL schema mismatch or a dead task-manager poller (restart Kibana).

## 4. Delivery risk pack (shipped)

| Template | Fires when |
|---|---|
| `sdlc-review-latency` | open PR awaiting review >5d |
| `sdlc-orphan-pr-age` | open PR >7d with no linked issue |
| `sdlc-stalled-items` | project item no update >14d (title at `payload.content.title`!) |
| `sdlc-ingest-stalled` | any source fresh-doc-count below threshold |
