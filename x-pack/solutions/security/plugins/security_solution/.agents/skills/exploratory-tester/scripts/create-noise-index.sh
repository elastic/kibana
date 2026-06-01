#!/usr/bin/env bash
# Creates a non-ECS noise index for exploratory testing.
# Intentionally uses wrong field types and missing fields to surface
# mapping-assumption bugs that clean ECS data never triggers.
#
# Usage:
#   bash <script> --es-url <url> --username <user> --password <pass>
#
# On success: prints the alias name and exits 0.
# On failure: prints the error and exits 1.

set -euo pipefail

ES_URL=""
USERNAME=""
PASSWORD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --es-url)    ES_URL="$2";    shift 2 ;;
    --username)  USERNAME="$2";  shift 2 ;;
    --password)  PASSWORD="$2";  shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$ES_URL" || -z "$USERNAME" || -z "$PASSWORD" ]]; then
  echo "Usage: $0 --es-url <url> --username <user> --password <pass>" >&2
  exit 1
fi

INDEX="logs-exploratory.noise-000001"
ALIAS="logs-exploratory.noise"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "Creating noise index $INDEX ..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -u "$USERNAME:$PASSWORD" \
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
elif [[ "$RESPONSE" == "400" ]]; then
  echo "Index already exists — reusing."
else
  echo "Unexpected status $RESPONSE creating index." >&2
  exit 1
fi

echo "Indexing noise documents ..."
curl -s -o /dev/null -w "%{http_code}\n" \
  -u "$USERNAME:$PASSWORD" \
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

echo "Noise index ready: $ALIAS"
