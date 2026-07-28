#!/usr/bin/env bash
# Creates a non-ECS noise index for exploratory testing.
# Intentionally uses wrong field types and missing fields to surface
# mapping-assumption bugs that clean ECS data never triggers.
#
# Usage:
#   bash <script> --es-url <url> --username <user> --password <pass>
#   bash <script> --es-url <url> --api-key <base64-encoded-key>
#   bash <script> ... --session-dir <session directory>
#
# On success: prints the alias name and exits 0.
# On failure: prints the error and exits 1.

set -euo pipefail

ES_URL=""
USERNAME=""
PASSWORD=""
API_KEY=""
SESSION_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --es-url)    ES_URL="$2";    shift 2 ;;
    --username)  USERNAME="$2";  shift 2 ;;
    --password)  PASSWORD="$2";  shift 2 ;;
    --api-key)   API_KEY="$2";   shift 2 ;;
    --session-dir) SESSION_DIR="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$ES_URL" ]]; then
  echo "Usage: $0 --es-url <url> (--username <u> --password <p> | --api-key <key>)" >&2
  exit 1
fi
if [[ -z "$API_KEY" && (-z "$USERNAME" || -z "$PASSWORD") ]]; then
  echo "Provide either --api-key or both --username and --password." >&2
  exit 1
fi

# Build auth header
if [[ -n "$API_KEY" ]]; then
  AUTH_HEADER="Authorization: ApiKey $API_KEY"
else
  AUTH_HEADER="Authorization: Basic $(echo -n "$USERNAME:$PASSWORD" | base64)"
fi

CURL_CONNECT_TIMEOUT="${EXPLORATORY_TESTER_CURL_CONNECT_TIMEOUT:-10}"
CURL_MAX_TIME="${EXPLORATORY_TESTER_CURL_MAX_TIME:-30}"
CURL_TIMEOUT_ARGS=(--connect-timeout "$CURL_CONNECT_TIMEOUT" --max-time "$CURL_MAX_TIME")

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

SCRIPT_DIR=""
INDEX_PREFIX="logs-exploratory.noise"
FALLBACK_INDEX_PREFIX="exploratory-noise"
if [[ -n "$SESSION_DIR" ]]; then
  SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
  SESSION_ID=$(PYTHONPATH="$SCRIPT_DIR" python3 - "$SESSION_DIR" <<'PY'
import sys
from pathlib import Path

from session_resources import load_session_config, require_session_id

config = load_session_config(Path(sys.argv[1]) / "config.json")
print(require_session_id(config))
PY
)
  INDEX_PREFIX="logs-exploratory.noise-$SESSION_ID"
  FALLBACK_INDEX_PREFIX="exploratory-noise-$SESSION_ID"
fi

# Try preferred index name first; fall back to non-logs prefix on serverless
# where logs-* matches a data stream template and cannot be used as a plain index.
INDEX_READY=false
INDEX_OWNED=false
for INDEX in "$INDEX_PREFIX-000001" "$FALLBACK_INDEX_PREFIX-000001"; do
  ALIAS="${INDEX%-000001}"   # strip trailing -000001

  echo "Creating noise index $INDEX ..."
  RESOURCE_STATE_BEFORE=none
  PENDING_BEFORE=false
  if [[ -n "$SESSION_DIR" ]]; then
    RESOURCE_STATE_BEFORE=$(PYTHONPATH="$SCRIPT_DIR" python3 - "$SESSION_DIR" "$INDEX" <<'PY'
import sys
from pathlib import Path

from session_resources import (
    load_session_config,
    require_session_id,
    resource_marker,
    resource_state,
)

config = load_session_config(Path(sys.argv[1]) / "config.json")
session_id = require_session_id(config)
resource = next(
    (
        resource
        for resource in config.get("session_resources", [])
        if resource.get("kind") == "es_index"
        and resource.get("id") == sys.argv[2]
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
    if [[ "$RESOURCE_STATE_BEFORE" == "pending" ]]; then
      PENDING_BEFORE=true
    elif [[ "$RESOURCE_STATE_BEFORE" == "none" ]]; then
      python3 "$SCRIPT_DIR/register-session-resource.py" \
        --session-dir "$SESSION_DIR" \
        --kind es_index \
        --id "$INDEX" \
        --endpoint "/$INDEX" \
        --base-url es_url \
        --pending
    fi
  fi
  # Keep set -e from aborting before reconcile on transport failures.
  RESPONSE=$(curl -s "${CURL_TIMEOUT_ARGS[@]}" -o /dev/null -w "%{http_code}" \
    -H "$AUTH_HEADER" \
    -X PUT "$ES_URL/$INDEX" \
    -H 'Content-Type: application/json' \
    -d "{
      \"mappings\": {
        \"properties\": {
          \"@timestamp\":         { \"type\": \"date\" },
          \"source.ip\":          { \"type\": \"text\" },
          \"destination.ip\":     { \"type\": \"text\" },
          \"event.kind\":         { \"type\": \"integer\" },
          \"host.name\":          { \"type\": \"keyword\" },
          \"message\":            { \"type\": \"text\" }
        }
      },
      \"aliases\": { \"$ALIAS\": {} }
    }" || printf '%s' '000')

  if [[ "$RESPONSE" == "200" ]]; then
    echo "Index created."
    INDEX_READY=true
    INDEX_OWNED=true
    if [[ -n "$SESSION_DIR" ]]; then
      python3 "$SCRIPT_DIR/register-session-resource.py" \
        --session-dir "$SESSION_DIR" \
        --kind es_index \
        --id "$INDEX" \
        --endpoint "/$INDEX" \
        --base-url es_url \
        --owned
    fi
    break
  elif [[ "$RESPONSE" == "400" ]]; then
    # Could be "already exists" (fine) or data stream conflict (retry with fallback name)
    BODY=$(curl -s "${CURL_TIMEOUT_ARGS[@]}" -H "$AUTH_HEADER" -X GET "$ES_URL/$INDEX" 2>/dev/null || true)
    if echo "$BODY" | grep -q '"mappings"'; then
      echo "Index already exists — reusing."
      INDEX_READY=true
      INDEX_OWNED=false
      if [[ -n "$SESSION_DIR" ]]; then
        OWNERSHIP_FLAG="--reused"
        if [[ "$RESOURCE_STATE_BEFORE" == "owned" || "$PENDING_BEFORE" == "true" ]]; then
          OWNERSHIP_FLAG="--owned"
          INDEX_OWNED=true
        fi
        python3 "$SCRIPT_DIR/register-session-resource.py" \
          --session-dir "$SESSION_DIR" \
          --kind es_index \
          --id "$INDEX" \
          --endpoint "/$INDEX" \
          --base-url es_url \
          "$OWNERSHIP_FLAG"
      fi
      break
    else
      echo "Index name $INDEX conflicts with a data stream template — trying fallback name ..."
      if [[ -n "$SESSION_DIR" ]]; then
        python3 "$SCRIPT_DIR/register-session-resource.py" \
          --session-dir "$SESSION_DIR" \
          --kind es_index \
          --id "$INDEX" \
          --endpoint "/$INDEX" \
          --base-url es_url \
          --remove-pending
      fi
      continue
    fi
  else
    if [[ -n "$SESSION_DIR" ]]; then
      RECONCILIATION_STATUS=0
      RECONCILIATION_OUTPUT=$(
        python3 "$SCRIPT_DIR/reconcile-session-resource.py" \
          --session-dir "$SESSION_DIR" \
          --kind es_index \
          --id "$INDEX" \
          --endpoint "/$INDEX" \
          --base-url es_url \
          --probe-method HEAD \
          2>&1
      ) || RECONCILIATION_STATUS=$?
      case "$RECONCILIATION_OUTPUT" in
        Reconciled\ *)
          echo "$RECONCILIATION_OUTPUT"
          INDEX_READY=true
          INDEX_OWNED=true
          break
          ;;
        Removed\ absent\ pending\ *)
          echo "$RECONCILIATION_OUTPUT"
          continue
          ;;
      esac
      if [[ "$RECONCILIATION_STATUS" -ne 0 ]]; then
        printf '%s\n' "$RECONCILIATION_OUTPUT" >&2
      fi
    fi
    echo "Unexpected status $RESPONSE creating index $INDEX." >&2
    exit 1
  fi
done

if [[ "$INDEX_READY" != true ]]; then
  echo "Unable to create or identify a reusable noise index." >&2
  exit 1
fi

echo "Indexing noise documents into $INDEX ..."
BULK_RESPONSE=$(curl -s "${CURL_TIMEOUT_ARGS[@]}" -w "\n%{http_code}" \
  -H "$AUTH_HEADER" \
  -X POST "$ES_URL/$INDEX/_bulk" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<NDJSON
{"index":{}}
{"@timestamp":"$TS","source.ip":"not-an-ip","event.kind":1,"host.name":"noise-host-1","message":"non-ECS source.ip (text instead of ip)"}
{"index":{}}
{"@timestamp":"$TS","destination.ip":"256.256.256.256","event.kind":99,"host.name":"noise-host-2","message":"out-of-range event.kind","custom_unmapped_field":"unexpected"}
{"index":{}}
{"@timestamp":"$TS","host.name":"noise-host-3","message":"missing source and destination fields entirely"}
NDJSON
)
BULK_STATUS="${BULK_RESPONSE##*$'\n'}"
BULK_BODY="${BULK_RESPONSE%$'\n'*}"

if [[ "$BULK_STATUS" != "200" ]]; then
  echo "Bulk index failed (HTTP $BULK_STATUS)." >&2
  exit 1
fi
if ! printf '%s' "$BULK_BODY" | python3 -c '
import json
import sys

try:
    response = json.load(sys.stdin)
except json.JSONDecodeError as exc:
    print(f"Bulk index returned invalid JSON: {exc}", file=sys.stderr)
    raise SystemExit(1)

if not isinstance(response, dict):
    print("Bulk index response was not a JSON object.", file=sys.stderr)
    raise SystemExit(1)
if response.get("errors") is True:
    print("Bulk index reported item-level errors.", file=sys.stderr)
    raise SystemExit(1)
if response.get("errors") is not False:
    print("Bulk index response omitted the errors flag.", file=sys.stderr)
    raise SystemExit(1)
'; then
  exit 1
fi

echo "Noise index ready: $ALIAS"
echo "NOISE_INDEX_NAME=$INDEX"
echo "NOISE_INDEX_ALIAS=$ALIAS"
echo "NOISE_INDEX_OWNED=$INDEX_OWNED"
