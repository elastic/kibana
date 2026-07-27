# Manufacturing a genuine positive-control alert

Used from `phases/2-explore.md` → "Confirm before logging" (absent-element path) and → "CCS-specific techniques", when you need to prove real data *exists* before concluding a feature is broken — i.e. to tell "the feature genuinely can't show this data" apart from "there is simply no data to show."

**Requires:** a source-cluster API key (`config.json → credentials.api_key`).
CCS also requires the remote credentials in `environment.ccs.remote`. Creates
a temporary detection rule and a temporary source index — clean both up at the
end of the session.

## Why a real fired alert, not an injected document

The cheap shortcut is to write a fake document straight into `.alerts-security.alerts-default`. Do not do this. A hand-written alert doc is not representative of anything the product produces — there is no real rule execution behind it, so a feature that reads it "working" tells you nothing about whether the feature works for real alerts. This is the same reason `scripts/create-noise-index.sh` builds a schema-realistic-but-flagged noise index instead of fabricating clean fake data: evidence is only worth logging if it is representative. A positive control must be a **genuinely rule-fired alert** — index a real source document, point a real rule at it, run the rule, and let the pipeline produce the alert.

## Template

Fill in `<SLUG>` (use `config.json → area_slug`), `<SESSION_ID>`,
`<KIBANA_URL>`, `<ES_URL>`, `<SPACE_ID>` (the flow's space), and
`<SOURCE_API_KEY>`. For CCS, also fill in `<REMOTE_API_KEY>`.
The session suffix is required: it prevents repeated or parallel sessions
from sharing a source index or rule name.

```bash
SOURCE_INDEX="logs-testing.<SLUG>-<SESSION_ID>-default"
RULE_NAME="positive-control-<SLUG>-<SESSION_ID>"
SOURCE_ES_URL="<ES_URL>"
SOURCE_API_KEY="<SOURCE_API_KEY>"
DATA_API_KEY="$SOURCE_API_KEY"
DATA_ES_URL="$SOURCE_ES_URL"
SOURCE_BASE_URL="es_url"
RULE_INDEX="$SOURCE_INDEX"
```

For CCS, the positive-control source is on REMOTE, not SOURCE:
```bash
DATA_ES_URL="<REMOTE_ES_URL>"
DATA_API_KEY="<REMOTE_API_KEY>"
SOURCE_BASE_URL="ccs_remote_es_url"
REMOTE_CLUSTER_ALIAS="<remote_cluster_alias>"
RULE_INDEX="${REMOTE_CLUSTER_ALIAS}:$SOURCE_INDEX"
```
The `environment.ccs.remote.es_url` value must be present in `config.json`;
`ccs_remote_es_url` makes cleanup target REMOTE rather than SOURCE.

### 1. Ensure an owned or reused source index, then index a real document

Check the manifest for a matching `pending` reservation, then check whether
`"$SOURCE_INDEX"` exists. If the `HEAD` request returns 200, set
`SOURCE_OWNERSHIP_FLAG=--owned` when the pending reservation belongs to this
session, otherwise set it to `--reused`. If the request returns 404 and there
is no pending reservation, reserve the resource before issuing the create
request:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind es_index \
  --id "$SOURCE_INDEX" \
  --endpoint "/$SOURCE_INDEX" \
  --base-url "$SOURCE_BASE_URL" \
  --pending
```
Create the index and set the flag to `--owned` only after a 200/201 response.
If a pending reservation existed before this attempt and the create responds
409, reconcile it as `--owned`; otherwise use `--reused`. Treat any other
response as a setup failure.

Register the physical source index before indexing the document:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind es_index \
  --id "$SOURCE_INDEX" \
  --endpoint "/$SOURCE_INDEX" \
  --base-url "$SOURCE_BASE_URL" \
  "$SOURCE_OWNERSHIP_FLAG"
```
Then index the document:
```bash
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
curl -s -X POST -H "Authorization: ApiKey $DATA_API_KEY" -H "Content-Type: application/json" \
  "$DATA_ES_URL/$SOURCE_INDEX/_doc?refresh=wait_for" \
  -d "{ \"@timestamp\": \"$NOW\", \"host\": { \"name\": \"positive-control-host\" }, \"event\": { \"category\": \"process\", \"action\": \"positive-control\" }, \"message\": \"exploratory-tester positive control\" }"
```

### 2. Create a real query detection rule against it
```bash
curl -s -X POST -H "Authorization: ApiKey $SOURCE_API_KEY" -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  "<KIBANA_URL>/s/<SPACE_ID>/api/detection_engine/rules" \
  -d '{ "type": "query", "name": "'"$RULE_NAME"'", "description": "exploratory-tester positive control", "risk_score": 21, "severity": "low", "index": ["'"$RULE_INDEX"'"], "query": "event.action: \"positive-control\"", "language": "kuery", "from": "now-1h", "interval": "5m", "enabled": true }'
```
Register the returned rule only after checking its response. Use `--owned`
for a 200/201 response and `--reused` for a 409/conflict:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind detection_rule \
  --id "$RULE_ID" \
  --endpoint "/s/$SPACE_ID/api/detection_engine/rules?id=$RULE_ID" \
  "$RULE_OWNERSHIP_FLAG"
```

Register targeted cleanup for alerts produced by this rule. This deletes only
documents with this rule UUID from the shared alerts index:
```bash
ALERT_DELETE_BODY=$(printf \
  '{"query":{"term":{"kibana.alert.rule.uuid":"%s"}}}' "$RULE_ID")
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind es_alerts \
  --id "positive-control-alerts-$RULE_ID" \
  --endpoint "/.alerts-security.alerts-<SPACE_ID>/_delete_by_query" \
  --base-url es_url \
  --method POST \
  --body-json "$ALERT_DELETE_BODY" \
  "$RULE_OWNERSHIP_FLAG"
```

### 3. Force immediate execution
```bash
curl -s -X POST -H "Authorization: ApiKey $SOURCE_API_KEY" -H "kbn-xsrf: true" \
  "<KIBANA_URL>/s/<SPACE_ID>/internal/alerting/rule/<RULE_ID>/_run_soon"
```

### 4. Confirm a genuine rule-fired alert appeared
```bash
curl -s -H "Authorization: ApiKey $SOURCE_API_KEY" -H "Content-Type: application/json" \
  "$SOURCE_ES_URL/.alerts-security.alerts-<SPACE_ID>/_search?pretty" \
  -d '{ "size": 1, "query": { "term": { "kibana.alert.rule.name": "'"$RULE_NAME"'" } } }'
```
A real alert has `kibana.alert.status`,
`kibana.alert.rule.rule_type_id: "siem.queryRule"`, and a populated
`kibana.alert.rule.uuid`. If those fields are present, the local pipeline
genuinely produced an alert — so if the feature under test still shows
nothing, the gap is the feature, not the data. For CCS, the data was indexed
on REMOTE, the rule queried the CCS pattern, and the alert verification still
uses SOURCE `SOURCE_ES_URL`.
`<remote_cluster_alias>:logs-testing.<SLUG>-<SESSION_ID>-default` in the rule
index.

The central session cleanup deletes only resources marked `--owned` with the
current session marker. Never manually delete a reused index or rule.

## Notes

- The rule-created alerts index is space-suffixed: `.alerts-security.alerts-<SPACE_ID>` (`-default` for the default space). Query the one matching the flow's space.
- This proves *data exists and the local/remote path works*. It does not by itself prove the feature under test is CCS-aware — pair it with the `index`-param diagnostic in the "CCS-specific techniques" section for that.
