#!/usr/bin/env bash
# Creates a non-ECS noise index for exploratory testing.
# Intentionally uses wrong field types and missing fields to surface
# mapping-assumption bugs that clean ECS data never triggers.
#
# Usage:
#   bash <script> --es-url <url> --username <user> --password <pass>
#   bash <script> --es-url <url> --api-key <base64-encoded-key>
#
# On success: prints the alias name and exits 0.
# On failure: prints the error and exits 1.

set -euo pipefail

ES_URL=""
USERNAME=""
PASSWORD=""
API_KEY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --es-url)    ES_URL="$2";    shift 2 ;;
    --username)  USERNAME="$2";  shift 2 ;;
    --password)  PASSWORD="$2";  shift 2 ;;
    --api-key)   API_KEY="$2";   shift 2 ;;
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

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Try preferred index name first; fall back to non-logs prefix on serverless
# where logs-* matches a data stream template and cannot be used as a plain index.
for INDEX in "logs-exploratory.noise-000001" "exploratory-noise-000001"; do
  ALIAS="${INDEX%-000001}"   # strip trailing -000001

  echo "Creating noise index $INDEX ..."
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
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
    }")

  if [[ "$RESPONSE" == "200" ]]; then
    echo "Index created."
    break
  elif [[ "$RESPONSE" == "400" ]]; then
    # Could be "already exists" (fine) or data stream conflict (retry with fallback name)
    BODY=$(curl -s -H "$AUTH_HEADER" -X GET "$ES_URL/$INDEX" 2>/dev/null || true)
    if echo "$BODY" | grep -q '"mappings"'; then
      echo "Index already exists — reusing."
      break
    else
      echo "Index name $INDEX conflicts with a data stream template — trying fallback name ..."
      continue
    fi
  else
    echo "Unexpected status $RESPONSE creating index $INDEX." >&2
    exit 1
  fi
done

echo "Indexing noise documents into $INDEX ..."
BULK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
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

if [[ "$BULK_STATUS" != "200" ]]; then
  echo "Bulk index failed (HTTP $BULK_STATUS)." >&2
  exit 1
fi

echo "Noise index ready: $ALIAS"
echo "NOISE_INDEX_ALIAS=$ALIAS"
