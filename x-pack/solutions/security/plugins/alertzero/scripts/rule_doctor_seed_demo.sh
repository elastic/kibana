#!/usr/bin/env bash
set -euo pipefail

# Seeds broken detection rules for the Rule Doctor demo.
#
# Creates source indices and seven enabled rules tagged "rule-doctor-demo":
#
#   1. No matching index  — searches logs-doctordemo_dns_v1*, but the data moved to logs-doctordemo_dns_v2.
#   2. Renamed field      — ES|QL query uses `user_name`, the data has `user.name`.
#   3. Renamed field      — EQL query uses `process.exe`, the data has `process.name`.
#   4. Bad timestamp      — timestamp override `event.created_at` exists in no index.
#   5. Data moved         — searches logs-doctordemo_vpn_legacy, quiet for 3 days; data now in logs-doctordemo_vpn.
#   6. Data gone          — searches logs-doctordemo_firewall, quiet for 5 days, nothing replaced it.
#   7. Healthy control    — runs clean on live data. The doctor must leave it alone.
#   8. Alert limit        — 60 events from one host against max_signals 20; a fit for suppression.
#   9. No ES|QL _id       — ES|QL query without METADATA _id (only warns if Kibana does not add it).
#  10. Missing indicators — indicator match on logs-doctordemo_ti_v1*; indicators moved to logs-doctordemo_ti_v2.
#  11. Over the cap      — max_signals 5000, above the default Kibana alerting limit of 1000.
#  12. Deleted data view — searches a data view id that does not exist.
#  13. Missing ML job    — machine learning rule on a job nobody installed (needs a Platinum or trial license).
#  14. Text grouping     — threshold rule groups by host.id, which is text in logs-doctordemo_textagg.
#  15. Bad query         — Lucene query with an unbalanced parenthesis.
#  16. Nothing anywhere  — searches logs-doctordemo_retired*, which no index matches and no integration ships.
#  17. Blind API key     — created by the doctor_demo_blind user, whose role cannot read logs-doctordemo_proc.
#
# Rules 1-4 and 12-15 fail or warn on their first run, rules 8-11, 16 and 17 warn. Rules 5-6 run clean and are only found
# by the sweep's freshness check. Wait about a minute after seeding, then run the
# sweep (the script prints the command).
#
# Usage:
#   KIBANA_URL=http://localhost:5621 bash rule_doctor_seed_demo.sh
#   KIBANA_URL=http://localhost:5621 bash rule_doctor_seed_demo.sh --cleanup
#
# Pass KIBANA_URL explicitly: a shell-wide default may point at another Kibana.
# Indices sit under logs-* so the worker service account can read them; logs-*-*
# would turn them into data streams.

KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_URL="${ES_URL:-http://localhost:9200}"
KIBANA_USER="${KIBANA_USER:-elastic}"
KIBANA_PASSWORD="${KIBANA_PASSWORD:-changeme}"
KIBANA_SPACE="${KIBANA_SPACE:-default}"
# Test-only user for demo 17. Its role reads one demo index, nothing else.
BLIND_USER="doctor_demo_blind"
BLIND_PASSWORD="${BLIND_PASSWORD:-doctor-demo-blind-pw}"
TAG="rule-doctor-demo"

echo "Kibana: $KIBANA_URL (space $KIBANA_SPACE), Elasticsearch: $ES_URL"

kbn() {
  local method="$1" path="$2" body="${3:-}"
  curl -sS -u "$KIBANA_USER:$KIBANA_PASSWORD" -X "$method" \
    -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
    -H 'elastic-api-version: 2023-10-31' \
    "$KIBANA_URL/s/$KIBANA_SPACE$path" ${body:+-d "$body"}
}

es() {
  local method="$1" path="$2" body="${3:-}"
  curl -sS -u "$KIBANA_USER:$KIBANA_PASSWORD" -X "$method" \
    -H 'Content-Type: application/json' \
    "$ES_URL$path" ${body:+-d "$body"}
}

iso() {
  # $1: offset in seconds back from now
  node -e "console.log(new Date(Date.now() - $1 * 1000).toISOString())"
}

cleanup() {
  echo "Deleting rules tagged $TAG"
  local ids
  ids=$(kbn GET "/api/detection_engine/rules/_find?per_page=100&filter=$(jq -rn --arg t "$TAG" '"alert.attributes.tags: \"\($t)\"" | @uri')" | jq -c '[.data[].id]')
  if [[ "$ids" != "[]" ]]; then
    kbn POST "/api/detection_engine/rules/_bulk_action" "{\"action\":\"delete\",\"ids\":$ids}" | jq -c '{deleted: .attributes.summary.succeeded}'
  fi
  es DELETE "/_security/user/$BLIND_USER" >/dev/null 2>&1 || true
  echo "Deleting logs-doctordemo_* indices"
  # Wildcard deletes are often disabled, so name each index.
  local names
  names=$(es GET "/_cat/indices/logs-doctordemo_*?h=index&expand_wildcards=open,closed" | paste -sd, -)
  if [[ -n "$names" ]]; then
    es DELETE "/$names" | jq -c '.'
  fi
}

if [[ "${1:-}" == "--cleanup" ]]; then
  cleanup
  exit 0
fi

cleanup >/dev/null 2>&1 || true

MAPPING='{
  "mappings": {
    "properties": {
      "@timestamp": {"type": "date"},
      "event.ingested": {"type": "date"},
      "event.outcome": {"type": "keyword"},
      "threat.indicator.type": {"type": "keyword"},
      "threat.indicator.ip": {"type": "ip"},
      "threat.feed.name": {"type": "keyword"},
      "event.category": {"type": "keyword"},
      "event.action": {"type": "keyword"},
      "host.name": {"type": "keyword"},
      "user.name": {"type": "keyword"},
      "process.name": {"type": "keyword"},
      "source.ip": {"type": "ip"},
      "destination.ip": {"type": "ip"},
      "dns.question.name": {"type": "keyword"}
    }
  }
}'

# $1 index, $2 seconds back for the newest event, $3 extra JSON fields for each doc
seed_index() {
  local index="$1" newest="$2" fields="$3" lines=""
  es PUT "/$index" "$MAPPING" >/dev/null
  for i in 0 60 120 300 600; do
    local ts
    ts=$(iso $((newest + i)))
    lines+="{\"index\":{\"_index\":\"$index\"}}"$'\n'
    lines+="{\"@timestamp\":\"$ts\",\"event.ingested\":\"$ts\",$fields}"$'\n'
  done
  printf '%s' "$lines" | curl -sS -u "$KIBANA_USER:$KIBANA_PASSWORD" -X POST \
    -H 'Content-Type: application/x-ndjson' "$ES_URL/_bulk?refresh=true" --data-binary @- |
    jq -c "{index: \"$index\", errors: .errors}"
}

echo "Seeding source indices"
seed_index logs-doctordemo_dns_v2 30 '"event.category":"network","host.name":"web-01","dns.question.name":"evil.example.com"'
seed_index logs-doctordemo_proc 30 '"event.category":"process","host.name":"build-02","user.name":"root","process.name":"nc"'
seed_index logs-doctordemo_web 30 '"event.category":"web","host.name":"web-01","user.name":"svc_web","source.ip":"203.0.113.7"'
seed_index logs-doctordemo_vpn_legacy $((3 * 86400)) '"event.category":"authentication","event.action":"vpn-login","user.name":"alice","source.ip":"198.51.100.4"'
seed_index logs-doctordemo_vpn 30 '"event.category":"authentication","event.action":"vpn-login","user.name":"alice","source.ip":"198.51.100.4"'
seed_index logs-doctordemo_firewall $((5 * 86400)) '"event.category":"network","event.action":"deny","destination.ip":"192.0.2.10"'
seed_index logs-doctordemo_ti_v2 30 '"threat.indicator.type":"ipv4-addr","threat.indicator.ip":"203.0.113.7","threat.feed.name":"demo"'

# One noisy host: 60 failed logins in the last few minutes.
noisy=""
for i in $(seq 1 60); do
  ts=$(iso $((i * 3)))
  noisy+="{\"index\":{\"_index\":\"logs-doctordemo_auth\"}}"$'\n'
  noisy+="{\"@timestamp\":\"$ts\",\"event.category\":\"authentication\",\"event.outcome\":\"failure\",\"host.name\":\"build-07\",\"user.name\":\"svc_build\"}"$'\n'
done
es PUT /logs-doctordemo_auth "$MAPPING" >/dev/null
printf '%s' "$noisy" | curl -sS -u "$KIBANA_USER:$KIBANA_PASSWORD" -X POST \
  -H 'Content-Type: application/x-ndjson' "$ES_URL/_bulk?refresh=true" --data-binary @- |
  jq -c '{index: "logs-doctordemo_auth", errors: .errors}'

# host.id is text here, so grouping by it fails with "Fielddata is disabled". Its
# keyword sub-field is what the doctor should group by instead.
es PUT /logs-doctordemo_textagg '{"mappings":{"properties":{"@timestamp":{"type":"date"},"host.id":{"type":"text","fields":{"keyword":{"type":"keyword"}}}}}}' >/dev/null
printf '{"index":{"_index":"logs-doctordemo_textagg"}}\n{"@timestamp":"%s","host.id":"host-1"}\n' "$(iso 30)" | curl -sS -u "$KIBANA_USER:$KIBANA_PASSWORD" -X POST \
  -H 'Content-Type: application/x-ndjson' "$ES_URL/_bulk?refresh=true" --data-binary @- |
  jq -c '{index: "logs-doctordemo_textagg", errors: .errors}'

# $1 rule JSON without the shared fields
create_rule() {
  local body
  body=$(jq -c --arg tag "$TAG" '. + {
    enabled: true,
    interval: "5m",
    from: "now-6m",
    risk_score: 47,
    severity: "medium",
    tags: [$tag],
    description: "Seeded by rule_doctor_seed_demo.sh"
  }' <<<"$1")
  kbn POST "/api/detection_engine/rules" "$body" | jq -c '{name, id, error: (.message // null)}'
}

echo "Creating rules"
create_rule '{"name":"Doctor demo: DNS to known bad domain","type":"query","language":"kuery","index":["logs-doctordemo_dns_v1*"],"query":"dns.question.name: \"evil.example.com\""}'
create_rule '{"name":"Doctor demo: netcat run as root","type":"esql","language":"esql","query":"FROM logs-doctordemo_proc METADATA _id, _index, _version | WHERE user_name == \"root\" AND process.name == \"nc\""}'
create_rule '{"name":"Doctor demo: netcat process","type":"eql","language":"eql","index":["logs-doctordemo_proc"],"query":"process where process.exe == \"nc\""}'
create_rule '{"name":"Doctor demo: web service account login","type":"query","language":"kuery","index":["logs-doctordemo_web"],"query":"user.name: \"svc_web\"","timestamp_override":"event.created_at"}'
create_rule '{"name":"Doctor demo: VPN login from new IP","type":"query","language":"kuery","index":["logs-doctordemo_vpn_legacy"],"query":"event.action: \"vpn-login\""}'
create_rule '{"name":"Doctor demo: firewall deny to crown jewel","type":"query","language":"kuery","index":["logs-doctordemo_firewall"],"query":"destination.ip: \"192.0.2.10\" and event.action: \"deny\""}'
create_rule '{"name":"Doctor demo: healthy control","type":"query","language":"kuery","index":["logs-doctordemo_web"],"query":"host.name: \"web-01\""}'
create_rule '{"name":"Doctor demo: failed service logins","type":"query","language":"kuery","index":["logs-doctordemo_auth"],"query":"event.category: \"authentication\" and event.outcome: \"failure\"","max_signals":20}'
create_rule '{"name":"Doctor demo: netcat via ES|QL without _id","type":"esql","language":"esql","query":"FROM logs-doctordemo_proc | WHERE process.name == \"nc\" | KEEP @timestamp, host.name, process.name"}'
create_rule '{"name":"Doctor demo: web traffic to known bad IP","type":"threat_match","language":"kuery","index":["logs-doctordemo_web"],"query":"*:*","threat_index":["logs-doctordemo_ti_v1*"],"threat_query":"*:*","threat_language":"kuery","threat_mapping":[{"entries":[{"field":"source.ip","type":"mapping","value":"threat.indicator.ip"}]}]}'
create_rule '{"name":"Doctor demo: failed logins over the cap","type":"query","language":"kuery","index":["logs-doctordemo_auth"],"query":"event.outcome: \"failure\"","max_signals":5000}'
create_rule '{"name":"Doctor demo: logins on a deleted data view","type":"query","language":"kuery","data_view_id":"doctordemo-deleted-view","query":"event.category: \"authentication\""}'
create_rule '{"name":"Doctor demo: rare process (ML)","type":"machine_learning","anomaly_threshold":75,"machine_learning_job_id":["doctordemo_rare_process"]}'
create_rule '{"name":"Doctor demo: busy host by id","type":"threshold","language":"kuery","index":["logs-doctordemo_textagg"],"query":"*:*","threshold":{"field":["host.id"],"value":1}}'
create_rule '{"name":"Doctor demo: unbalanced Lucene query","type":"query","language":"lucene","index":["logs-doctordemo_web"],"query":"user.name:(svc_web"}'

create_rule '{"name":"Doctor demo: retired source","type":"query","language":"kuery","index":["logs-doctordemo_retired*"],"query":"event.module: \"legacy_ids\" and event.action: \"signature_match\""}'

# Rule 17 runs with the blind user's API key, which cannot see logs-doctordemo_proc.
kbn PUT "/api/security/role/doctor_demo_blind" '{"elasticsearch":{"indices":[{"names":["logs-doctordemo_web"],"privileges":["read","view_index_metadata"]}]},"kibana":[{"base":["all"],"spaces":["*"]}]}' >/dev/null
es POST "/_security/user/$BLIND_USER" "{\"password\":\"$BLIND_PASSWORD\",\"roles\":[\"doctor_demo_blind\"]}" >/dev/null
KIBANA_USER="$BLIND_USER" KIBANA_PASSWORD="$BLIND_PASSWORD" create_rule '{"name":"Doctor demo: netcat seen by a blind key","type":"query","language":"kuery","index":["logs-doctordemo_proc"],"query":"process.name: \"nc\""}'

cat <<EOF

Done. Wait about a minute for the first runs, then check the rules:

  curl -sS -u $KIBANA_USER:*** -H 'elastic-api-version: 2023-10-31' \\
    '$KIBANA_URL/s/$KIBANA_SPACE/api/detection_engine/rules/_find?per_page=100&filter=alert.attributes.tags:%22$TAG%22' \\
    | jq -r '.data[] | "\(.execution_summary.last_execution.status // "not run")\t\(.name)"'

Then run the doctor sweep:

  curl -sS -u $KIBANA_USER:*** -X POST -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \\
    -H 'elastic-api-version: 2023-10-31' \\
    '$KIBANA_URL/s/$KIBANA_SPACE/api/workflows/workflow/system-security-rule-doctor-sweep/run' \\
    -d '{"inputs":{}}'
EOF
