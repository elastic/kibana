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
RULE_ID="positive-control-<SLUG>-<SESSION_ID>"
RULE_SAVED_OBJECT_ID=""
SOURCE_ES_URL="<ES_URL>"
SOURCE_API_KEY="<SOURCE_API_KEY>"
DATA_API_KEY="$SOURCE_API_KEY"
DATA_ES_URL="$SOURCE_ES_URL"
SOURCE_BASE_URL="es_url"
RULE_INDEX="$SOURCE_INDEX"
CURL_CONNECT_TIMEOUT="${EXPLORATORY_TESTER_CURL_CONNECT_TIMEOUT:-10}"
CURL_MAX_TIME="${EXPLORATORY_TESTER_CURL_MAX_TIME:-30}"
CURL_TIMEOUT_ARGS=(--connect-timeout "$CURL_CONNECT_TIMEOUT" --max-time "$CURL_MAX_TIME")
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

Check the manifest and the deterministic Elasticsearch endpoint before
assigning ownership. A resource that was merely found remotely is reused; a
resource reserved by this session is owned only after a successful create or
reconciliation:
```bash
SOURCE_OWNERSHIP_FLAG=""
SOURCE_RESOURCE_STATE=none
if [[ -n "${SESSION_DIR:-}" ]]; then
  SOURCE_RESOURCE_STATE=$(PYTHONPATH=x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts \
    python3 - "$SESSION_DIR" "$SOURCE_INDEX" <<'PY'
import sys
from pathlib import Path

from session_resources import load_session_config, resource_marker, resource_state, require_session_id

config = load_session_config(Path(sys.argv[1]) / "config.json")
session_id = require_session_id(config)
resource = next(
    (
        item for item in config.get("session_resources", [])
        if item.get("kind") == "es_index" and item.get("id") == sys.argv[2]
    ),
    None,
)
print(
    resource_state(resource)
    if resource and resource.get("marker") == resource_marker(session_id)
    else "none"
)
PY
  )
fi
SOURCE_HEAD_STATUS=$(curl -s "${CURL_TIMEOUT_ARGS[@]}" -o /dev/null -w "%{http_code}" \
  -H "Authorization: ApiKey $DATA_API_KEY" \
  -X HEAD "$DATA_ES_URL/$SOURCE_INDEX")
case "$SOURCE_HEAD_STATUS" in
  200)
    if [[ "$SOURCE_RESOURCE_STATE" == "owned" || "$SOURCE_RESOURCE_STATE" == "pending" ]]; then
      SOURCE_OWNERSHIP_FLAG="--owned"
    else
      SOURCE_OWNERSHIP_FLAG="--reused"
    fi
    ;;
  404)
    if [[ "$SOURCE_RESOURCE_STATE" != "pending" ]]; then
      python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
        --session-dir "$SESSION_DIR" \
        --kind es_index \
        --id "$SOURCE_INDEX" \
        --endpoint "/$SOURCE_INDEX" \
        --base-url "$SOURCE_BASE_URL" \
        --pending
    fi
    SOURCE_CREATE_RESPONSE=$(curl -s "${CURL_TIMEOUT_ARGS[@]}" -w '\n%{http_code}' \
      -H "Authorization: ApiKey $DATA_API_KEY" \
      -X PUT "$DATA_ES_URL/$SOURCE_INDEX" \
      -H 'Content-Type: application/json' \
      -d '{}')
    SOURCE_CREATE_STATUS="${SOURCE_CREATE_RESPONSE##*$'\n'}"
    SOURCE_CREATE_BODY="${SOURCE_CREATE_RESPONSE%$'\n'*}"
    case "$SOURCE_CREATE_STATUS" in
      200|201)
        if ! printf '%s' "$SOURCE_CREATE_BODY" | python3 -c \
          'import json,sys; p=json.load(sys.stdin); raise SystemExit(0 if p.get("acknowledged") is True else 1)'; then
          echo "Source index creation response was not acknowledged." >&2
          exit 1
        fi
        SOURCE_OWNERSHIP_FLAG="--owned"
        ;;
      409)
        if [[ "$SOURCE_RESOURCE_STATE" == "pending" ]]; then
          SOURCE_OWNERSHIP_FLAG="--owned"
        else
          SOURCE_OWNERSHIP_FLAG="--reused"
        fi
        ;;
      *)
        python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/reconcile-session-resource.py \
          --session-dir "$SESSION_DIR" \
          --kind es_index \
          --id "$SOURCE_INDEX" \
          --endpoint "/$SOURCE_INDEX" \
          --base-url "$SOURCE_BASE_URL" \
          --probe-method HEAD \
          --fail-on-absent || exit 1
        SOURCE_OWNERSHIP_FLAG="--owned"
        ;;
    esac
    ;;
  *)
    echo "Unable to probe source index (HTTP $SOURCE_HEAD_STATUS)." >&2
    exit 1
    ;;
esac
: "${SOURCE_OWNERSHIP_FLAG:?Source index ownership was not resolved}"

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
SOURCE_DOCUMENT_RESPONSE=$(curl -s "${CURL_TIMEOUT_ARGS[@]}" -w '\n%{http_code}' -X POST \
  -H "Authorization: ApiKey $DATA_API_KEY" -H "Content-Type: application/json" \
  "$DATA_ES_URL/$SOURCE_INDEX/_doc?refresh=wait_for" \
  -d "{ \"@timestamp\": \"$NOW\", \"host\": { \"name\": \"positive-control-host\" }, \"event\": { \"category\": \"process\", \"action\": \"positive-control\" }, \"message\": \"exploratory-tester positive control\" }")
SOURCE_DOCUMENT_STATUS="${SOURCE_DOCUMENT_RESPONSE##*$'\n'}"
SOURCE_DOCUMENT_BODY="${SOURCE_DOCUMENT_RESPONSE%$'\n'*}"
if [[ "$SOURCE_DOCUMENT_STATUS" != "200" && "$SOURCE_DOCUMENT_STATUS" != "201" ]] ||
   ! printf '%s' "$SOURCE_DOCUMENT_BODY" | python3 -c \
     'import json,sys; p=json.load(sys.stdin); raise SystemExit(0 if p.get("result") in {"created","updated"} else 1)'; then
  echo "Source document indexing failed (HTTP $SOURCE_DOCUMENT_STATUS)." >&2
  exit 1
fi
```

### 2. Create a real query detection rule against it
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind detection_rule \
  --id "$RULE_ID" \
  --endpoint "/s/$SPACE_ID/api/detection_engine/rules?rule_id=$RULE_ID" \
  --pending
ALERT_DELETE_BODY=$(printf \
  '{"query":{"term":{"kibana.alert.rule.rule_id":"%s"}}}' "$RULE_ID")
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind es_alerts \
  --id "positive-control-alerts-$RULE_ID" \
  --endpoint "/.alerts-security.alerts-$SPACE_ID/_delete_by_query" \
  --base-url es_url \
  --method POST \
  --body-json "$ALERT_DELETE_BODY" \
  --pending
RULE_RESPONSE=$(
  curl -s "${CURL_TIMEOUT_ARGS[@]}" -w '\n%{http_code}' -X POST \
    -H "Authorization: ApiKey $SOURCE_API_KEY" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -H "elastic-api-version: 2023-10-31" \
    "<KIBANA_URL>/s/<SPACE_ID>/api/detection_engine/rules" \
    -d '{ "rule_id": "'"$RULE_ID"'", "type": "query", "name": "'"$RULE_NAME"'", "description": "exploratory-tester positive control", "risk_score": 21, "severity": "low", "index": ["'"$RULE_INDEX"'"], "query": "event.action: \"positive-control\"", "language": "kuery", "from": "now-1h", "interval": "5m", "enabled": true }'
)
RULE_HTTP_STATUS="${RULE_RESPONSE##*$'\n'}"
RULE_BODY="${RULE_RESPONSE%$'\n'*}"
case "$RULE_HTTP_STATUS" in
  200|201|409) RULE_OWNERSHIP_FLAG="--owned" ;;
  *)
    echo "Rule creation failed (HTTP $RULE_HTTP_STATUS)." >&2
    RULE_RECONCILIATION_OUTPUT=$(
      python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/reconcile-session-resource.py \
      --session-dir "$SESSION_DIR" \
      --kind detection_rule \
      --id "$RULE_ID" \
      --endpoint "/s/$SPACE_ID/api/detection_engine/rules?rule_id=$RULE_ID" \
      --probe-method GET \
      2>&1
    ) || true
    printf '%s\n' "$RULE_RECONCILIATION_OUTPUT" >&2
    case "$RULE_RECONCILIATION_OUTPUT" in
      Removed\ absent\ pending\ *)
        python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
          --session-dir "$SESSION_DIR" \
          --kind es_alerts \
          --id "positive-control-alerts-$RULE_ID" \
          --endpoint "/.alerts-security.alerts-$SPACE_ID/_delete_by_query" \
          --remove-pending
        ;;
    esac
    exit 1
    ;;
esac
if [[ "$RULE_HTTP_STATUS" == "409" ]]; then
  RULE_LOOKUP_RESPONSE=$(
    curl -s "${CURL_TIMEOUT_ARGS[@]}" -w '\n%{http_code}' -X GET \
      -H "Authorization: ApiKey $SOURCE_API_KEY" \
      -H "elastic-api-version: 2023-10-31" \
      "<KIBANA_URL>/s/<SPACE_ID>/api/detection_engine/rules?rule_id=$RULE_ID"
  )
  RULE_LOOKUP_STATUS="${RULE_LOOKUP_RESPONSE##*$'\n'}"
  RULE_LOOKUP_BODY="${RULE_LOOKUP_RESPONSE%$'\n'*}"
  if [[ "$RULE_LOOKUP_STATUS" != "200" ]]; then
    echo "Unable to look up the existing positive-control rule." >&2
    exit 1
  fi
  RULE_SAVED_OBJECT_ID=$(printf '%s' "$RULE_LOOKUP_BODY" | python3 -c \
    'import json,sys; p=json.load(sys.stdin); print(p.get("id") or "")')
else
  RESPONSE_RULE_ID=$(printf '%s' "$RULE_BODY" | python3 -c \
    'import json,sys; p=json.load(sys.stdin); print(p.get("rule_id") or "")')
  RULE_SAVED_OBJECT_ID=$(printf '%s' "$RULE_BODY" | python3 -c \
    'import json,sys; p=json.load(sys.stdin); print(p.get("id") or "")')
  if [[ "$RESPONSE_RULE_ID" != "$RULE_ID" ]]; then
    echo "Rule response did not contain the deterministic rule id." >&2
    exit 1
  fi
fi
: "${RULE_SAVED_OBJECT_ID:?Rule response did not contain a saved-object id}"
```
The deterministic `rule_id` and the pending reservation close the
create-before-register window. Reconcile it as owned after a successful or
conflict response:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind detection_rule \
  --id "$RULE_ID" \
  --endpoint "/s/$SPACE_ID/api/detection_engine/rules?rule_id=$RULE_ID" \
  "$RULE_OWNERSHIP_FLAG"
```
The targeted alert cleanup reservation was created before the rule request.
Once the rule is owned, promote that reservation before execution:
```bash
python3 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/register-session-resource.py \
  --session-dir "$SESSION_DIR" \
  --kind es_alerts \
  --id "positive-control-alerts-$RULE_ID" \
  --endpoint "/.alerts-security.alerts-$SPACE_ID/_delete_by_query" \
  --base-url es_url \
  --method POST \
  --body-json "$ALERT_DELETE_BODY" \
  "$RULE_OWNERSHIP_FLAG"
```

### 3. Force immediate execution
```bash
RUN_SOON_RESPONSE=$(curl -s "${CURL_TIMEOUT_ARGS[@]}" -w '\n%{http_code}' -X POST \
  -H "Authorization: ApiKey $SOURCE_API_KEY" \
  -H "kbn-xsrf: true" -H "x-elastic-internal-origin: kibana" \
  "<KIBANA_URL>/s/<SPACE_ID>/internal/alerting/rule/<RULE_SAVED_OBJECT_ID>/_run_soon")
RUN_SOON_STATUS="${RUN_SOON_RESPONSE##*$'\n'}"
if [[ "$RUN_SOON_STATUS" != "200" && "$RUN_SOON_STATUS" != "202" && "$RUN_SOON_STATUS" != "204" ]]; then
  echo "Unable to run positive-control rule (HTTP $RUN_SOON_STATUS)." >&2
  exit 1
fi
```

### 4. Confirm a genuine rule-fired alert appeared
```bash
ALERT_POLL_TIMEOUT_SECONDS=60
ALERT_POLL_INTERVAL_SECONDS=2
ALERT_POLL_DEADLINE=$((SECONDS + ALERT_POLL_TIMEOUT_SECONDS))
ALERT_FOUND=false
while (( SECONDS <= ALERT_POLL_DEADLINE )); do
  ALERT_RESPONSE=$(curl -s "${CURL_TIMEOUT_ARGS[@]}" -w '\n%{http_code}' \
    -H "Authorization: ApiKey $SOURCE_API_KEY" -H "Content-Type: application/json" \
    "$SOURCE_ES_URL/.alerts-security.alerts-$SPACE_ID/_search" \
    -d '{ "size": 1, "query": { "term": { "kibana.alert.rule.rule_id": "'"$RULE_ID"'" } } }')
  ALERT_STATUS="${ALERT_RESPONSE##*$'\n'}"
  ALERT_BODY="${ALERT_RESPONSE%$'\n'*}"
  if [[ "$ALERT_STATUS" != "200" ]]; then
    echo "Alert search failed (HTTP $ALERT_STATUS)." >&2
    exit 1
  fi
  ALERT_TOTAL=$(
    printf '%s' "$ALERT_BODY" | python3 -c '
import json
import sys

try:
    response = json.load(sys.stdin)
    if not isinstance(response, dict):
        raise ValueError("response is not an object")
    total = response.get("hits", {}).get("total", 0)
    total = total.get("value", 0) if isinstance(total, dict) else total
    if not isinstance(total, int):
        raise ValueError("hits.total is not an integer")
    print(total)
except (AttributeError, json.JSONDecodeError, TypeError, ValueError) as exc:
    print(f"Invalid alert search response: {exc}", file=sys.stderr)
    raise SystemExit(1)
'
  ) || exit 1
  if (( ALERT_TOTAL > 0 )); then
    ALERT_FOUND=true
    break
  fi
  sleep "$ALERT_POLL_INTERVAL_SECONDS"
done
if [[ "$ALERT_FOUND" != true ]]; then
  echo "Timed out waiting for a positive-control alert for rule $RULE_ID." >&2
  exit 1
fi
RULE_ID="$RULE_ID" ALERT_BODY="$ALERT_BODY" python3 -c '
import json
import os

response = json.loads(os.environ["ALERT_BODY"])
hits = response.get("hits", {}).get("hits", [])
source = hits[0].get("_source", {}) if hits else {}
if (
    not source.get("kibana.alert.status")
    or source.get("kibana.alert.rule.rule_type_id") != "siem.queryRule"
    or source.get("kibana.alert.rule.rule_id") != os.environ["RULE_ID"]
):
    raise SystemExit("Alert response is missing genuine rule-fired fields")
'
```
A real alert has `kibana.alert.status`,
`kibana.alert.rule.rule_type_id: "siem.queryRule"`, and a populated
`kibana.alert.rule.rule_id` matching `$RULE_ID`. If those fields are present, the local pipeline
genuinely produced an alert — so if the feature under test still shows
nothing, the gap is the feature, not the data. For CCS, the data was indexed
on REMOTE, the rule queried the remote-prefixed pattern, and the alert
verification uses the SOURCE `SOURCE_ES_URL`.

The central session cleanup deletes only resources marked `--owned` with the
current session marker. Never manually delete a reused index or rule.

## Notes

- The rule-created alerts index is space-suffixed: `.alerts-security.alerts-<SPACE_ID>` (`-default` for the default space). Query the one matching the flow's space.
- This proves *data exists and the local/remote path works*. It does not by itself prove the feature under test is CCS-aware — pair it with the `index`-param diagnostic in the "CCS-specific techniques" section for that.
