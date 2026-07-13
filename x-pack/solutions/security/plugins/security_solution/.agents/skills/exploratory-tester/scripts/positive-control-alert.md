# Manufacturing a genuine positive-control alert

Used from `phases/2-explore.md` → "Confirm before logging" (absent-element path) and → "CCS-specific techniques", when you need to prove real data *exists* before concluding a feature is broken — i.e. to tell "the feature genuinely can't show this data" apart from "there is simply no data to show."

**Requires:** an admin API key (`config.json → credentials.api_key`). Creates a temporary detection rule and a temporary source index — clean both up at the end of the session (step 5).

## Why a real fired alert, not an injected document

The cheap shortcut is to write a fake document straight into `.alerts-security.alerts-default`. Do not do this. A hand-written alert doc is not representative of anything the product produces — there is no real rule execution behind it, so a feature that reads it "working" tells you nothing about whether the feature works for real alerts. This is the same reason `scripts/create-noise-index.sh` builds a schema-realistic-but-flagged noise index instead of fabricating clean fake data: evidence is only worth logging if it is representative. A positive control must be a **genuinely rule-fired alert** — index a real source document, point a real rule at it, run the rule, and let the pipeline produce the alert.

## Template

Fill in `<SLUG>` (use `config.json → area_slug`), `<KIBANA_URL>`, `<ES_URL>`, `<SPACE_ID>` (the flow's space), and `<API_KEY>`.

### 1. Index a real source document into a `logs-*`-matching index
```bash
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
curl -s -X POST -H "Authorization: ApiKey <API_KEY>" -H "Content-Type: application/json" \
  "<ES_URL>/logs-testing.<SLUG>-default/_doc?refresh=wait_for" \
  -d "{ \"@timestamp\": \"$NOW\", \"host\": { \"name\": \"positive-control-host\" }, \"event\": { \"category\": \"process\", \"action\": \"positive-control\" }, \"message\": \"exploratory-tester positive control\" }"
```

### 2. Create a real query detection rule against it
```bash
curl -s -X POST -H "Authorization: ApiKey <API_KEY>" -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  "<KIBANA_URL>/s/<SPACE_ID>/api/detection_engine/rules" \
  -d '{ "type": "query", "name": "positive-control-<SLUG>", "description": "exploratory-tester positive control", "risk_score": 21, "severity": "low", "index": ["logs-testing.<SLUG>-default"], "query": "event.action: \"positive-control\"", "language": "kuery", "from": "now-1h", "interval": "5m", "enabled": true }'
```
Record the returned rule `id`.

### 3. Force immediate execution
```bash
curl -s -X POST -H "Authorization: ApiKey <API_KEY>" -H "kbn-xsrf: true" \
  "<KIBANA_URL>/s/<SPACE_ID>/internal/alerting/rule/<RULE_ID>/_run_soon"
```

### 4. Confirm a genuine rule-fired alert appeared
```bash
curl -s -H "Authorization: ApiKey <API_KEY>" -H "Content-Type: application/json" \
  "<ES_URL>/.alerts-security.alerts-<SPACE_ID>/_search?pretty" \
  -d '{ "size": 1, "query": { "term": { "kibana.alert.rule.name": "positive-control-<SLUG>" } } }'
```
A real alert has `kibana.alert.status`, `kibana.alert.rule.rule_type_id: "siem.queryRule"`, and a populated `kibana.alert.rule.uuid`. If those fields are present, the local pipeline genuinely produced an alert — so if the feature under test still shows nothing, the gap is the feature, not the data. **For CCS:** index the step-1 document on the **REMOTE** cluster and point the rule's `index` at the CCS pattern `<remote_cluster_alias>:logs-testing.<SLUG>-default` to prove the remote data path specifically.

### 5. Clean up at end of session
```bash
curl -s -X DELETE -H "Authorization: ApiKey <API_KEY>" -H "kbn-xsrf: true" \
  "<KIBANA_URL>/s/<SPACE_ID>/api/detection_engine/rules?id=<RULE_ID>"
curl -s -X DELETE -H "Authorization: ApiKey <API_KEY>" \
  "<ES_URL>/logs-testing.<SLUG>-default"
```
Note the cleanup in the finding so the environment is known to be left clean.

## Notes

- The rule-created alerts index is space-suffixed: `.alerts-security.alerts-<SPACE_ID>` (`-default` for the default space). Query the one matching the flow's space.
- This proves *data exists and the local/remote path works*. It does not by itself prove the feature under test is CCS-aware — pair it with the `index`-param diagnostic in the "CCS-specific techniques" section for that.
