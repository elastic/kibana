#!/usr/bin/env bash
#
# One-command demo seed for the Nightshift landing page.
#
# Seeds significant events, discoveries, detections, backing stream data, and
# Knowledge Indicator (KI) entity features so the full UI is populated:
#   - Landing page (Need action / Resolved, blast-radius stream chips)
#   - Event flyout (summary, detections list, lifecycle)
#   - Detection flyout (trend chart, ES|QL evidence, entity pills)
#   - Entity flyout (summary, evidence, raw document)
#
# Summaries and signal descriptions are lengthened past the Nightshift 300 code-point
# truncation threshold so event, detection, and entity flyouts show "Show more" after seeding.
#
# Schema (post #277711 / signals model):
#   - status: open | closed | dismissed
#   - severity: 20-low | 40-medium | 60-high | 80-critical
#   - signals[] (not evidences[]) carries detection metadata + ES|QL evidence
#   - event_uuid is the document version id; event_id is the stable incident key
#   - causal_features[] links events to KI entity features for entity pills
#
# Requires: curl, python3, a running Elasticsearch + Kibana (for KI features).
#
# Usage:
#   ./seed_nightshift.sh              # seed (upsert features, replace stream docs)
#   ./seed_nightshift.sh --clean      # delete prior seed indices, then seed
#
# Environment:
#   ES_URL          (default: http://localhost:9200)
#   ES_AUTH         (default: elastic:changeme)
#   KIBANA_URL      (default: http://localhost:5601 — base path is auto-detected)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ES_URL="${ES_URL:-http://localhost:9200}"
ES_AUTH="${ES_AUTH:-elastic:changeme}"
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"

# Dev Kibana often runs with server.basePath (e.g. /hdj). Auto-detect from redirect.
resolve_kibana_url() {
  local url="${1%/}"
  if [[ "$url" =~ ^https?://[^/]+/.+ ]]; then
    echo "$url"
    return
  fi
  local location
  location=$(curl -sI -u "$ES_AUTH" "${url}/" | tr -d '\r' | awk -F': ' 'tolower($1)=="location"{print $2}' | head -1)
  if [[ -n "$location" && "$location" =~ ^/[^/?]+/?$ ]]; then
    echo "${url}${location%/}"
  else
    echo "$url"
  fi
}

KIBANA_URL="$(resolve_kibana_url "$KIBANA_URL")"

INDEX=".significant_events-events"
DETECTIONS_INDEX=".significant_events-detections"
DISCOVERIES_INDEX=".significant_events-discoveries"

CLEAN=false
if [[ "${1:-}" == "--clean" ]]; then
  CLEAN=true
elif [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
elif [[ -n "${1:-}" ]]; then
  echo "Unknown argument: $1 (try --help)" >&2
  exit 1
fi

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
HOUR_AGO=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "1 hour ago" +%Y-%m-%dT%H:%M:%SZ)
TWO_HOURS_AGO=$(date -u -v-2H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "2 hours ago" +%Y-%m-%dT%H:%M:%SZ)
THREE_HOURS_AGO=$(date -u -v-3H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "3 hours ago" +%Y-%m-%dT%H:%M:%SZ)
SIX_HOURS_AGO=$(date -u -v-6H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "6 hours ago" +%Y-%m-%dT%H:%M:%SZ)
YESTERDAY=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "24 hours ago" +%Y-%m-%dT%H:%M:%SZ)

bulk_index() {
  local label="$1"
  local target_index="$2"
  local body="$3"

  echo ""
  echo "Seeding ${label} into ${ES_URL} / ${target_index} ..."

  local result
  result=$(curl -s -u "$ES_AUTH" -X POST "${ES_URL}/${target_index}/_bulk?refresh=true" \
    -H "Content-Type: application/x-ndjson" \
    --data-binary "${body}
")

  local errors
  errors=$(echo "$result" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('errors', True))")
  if [[ "$errors" == "True" || "$errors" == "true" ]]; then
    echo "ERROR: Bulk index into ${target_index} had failures:" >&2
    echo "$result" | python3 -m json.tool >&2
    exit 1
  fi
}

lengthen_significant_events_ndjson() {
  local body="$1"
  SCRIPT_DIR="$SCRIPT_DIR" BODY="$body" ES_URL="$ES_URL" ES_AUTH="$ES_AUTH" KIBANA_URL="$KIBANA_URL" python3 -c '
import os, sys
sys.path.insert(0, os.environ["SCRIPT_DIR"])
from seed_nightshift_helpers import lengthen_significant_events_ndjson
print(lengthen_significant_events_ndjson(os.environ["BODY"]), end="")
'
}

if [[ "$CLEAN" == "true" ]]; then
  echo "Cleaning prior Nightshift seed indices ..."
  for idx in "$INDEX" "$DETECTIONS_INDEX" "$DISCOVERIES_INDEX"; do
    curl -s -u "$ES_AUTH" -X DELETE "${ES_URL}/${idx}" >/dev/null || true
    echo "  deleted ${idx} (if it existed)"
  done
  for idx in logs.web-frontend logs.api-gateway \
    metrics.payment-service logs.payment-service \
    metrics.elasticsearch-cluster logs.elasticsearch \
    logs.dns-resolver logs.ingress-controller \
    metrics.kafka-cluster logs.order-processing metrics.cache-service; do
    curl -s -u "$ES_AUTH" -X DELETE "${ES_URL}/_data_stream/${idx}" >/dev/null || true
    curl -s -u "$ES_AUTH" -X DELETE "${ES_URL}/${idx}" >/dev/null || true
    curl -s -u "$ES_AUTH" -X DELETE "${ES_URL}/_index_template/nightshift-${idx//./-}" >/dev/null || true
    echo "  deleted backing stream ${idx} (if it existed)"
  done
fi

echo "Using Kibana at ${KIBANA_URL} ..."
echo "Ensuring Streams is enabled via Kibana ..."
STREAMS_RESPONSE_FILE=$(mktemp "${TMPDIR:-/tmp}/seed_nightshift_streams.XXXXXX")
STREAMS_STATUS=$(curl -s -o "$STREAMS_RESPONSE_FILE" -w "%{http_code}" -u "$ES_AUTH" \
  -X POST "${KIBANA_URL}/api/streams/_enable" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: Kibana")
if [[ "$STREAMS_STATUS" == "200" ]]; then
  echo "  Streams enabled."
elif [[ "$STREAMS_STATUS" == "400" ]]; then
  if grep -q "already enabled\|Cannot change stream types" "$STREAMS_RESPONSE_FILE" 2>/dev/null; then
    echo "  Streams already enabled."
  else
    echo "WARNING: Streams enable returned 400:" >&2
    cat "$STREAMS_RESPONSE_FILE" >&2
  fi
elif [[ "$STREAMS_STATUS" == "404" ]]; then
  echo "WARNING: Streams API not found — KI feature seeding may fail." >&2
else
  echo "WARNING: Unexpected Streams enable status ${STREAMS_STATUS} — continuing." >&2
fi
rm -f "$STREAMS_RESPONSE_FILE"

# ---------------------------------------------------------------------------
# Events (.significant_events-events)
# ---------------------------------------------------------------------------
EVENTS_BODY=$(cat <<NDJSON
{"create":{}}
{"@timestamp":"${HOUR_AGO}","event_id":"evt-001","event_uuid":"evt-uuid-001","discovery_id":"discovery-001","status":"open","severity":"80-critical","confidence":0.92,"stream_names":["logs.web-frontend","logs.api-gateway"],"title":"Web frontend — login and browse latency","summary":"P95 latency jumped from about 120ms to 890ms on web-frontend and api-gateway around the api-gateway v2.8.1 rollout. Checkout and browse flows are degraded for web users, with no recovery yet.","symptom_hypothesis":"Api-gateway auth middleware is doing a synchronous database lookup that blocks the event loop under load after the v2.8.1 deploy.","causal_features":[{"feature_id":"web-frontend","name":"web-frontend","stream_name":"logs.web-frontend"},{"feature_id":"api-gateway","name":"api-gateway","stream_name":"logs.api-gateway"}],"signals":[{"type":"detection","stream_name":"logs.web-frontend","confirmed":true,"collected_at":"${HOUR_AGO}","description":"Testing: whether web-frontend request latency spiked with the api-gateway rollout. Expected if true: sustained P95 above the prior baseline. Found: P95 rose from about 120ms to 890ms within ten minutes of the deploy. Why: latency tracks the auth middleware path on the new build. Verdict: confirms — login and browse are slowed for users hitting web-frontend.","evidence":{"esql_query":"FROM logs.web-frontend\n| WHERE service.name == \"web-frontend\"\n  AND transaction.type == \"request\"\n| STATS p95_latency = PERCENTILE(transaction.duration.us, 95)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| WHERE p95_latency > 300000\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-001","rule_uuid":"rule-uuid-001","rule_name":"latency-p95-spike","change_point_type":"spike","p_value":0.01}},{"type":"detection","stream_name":"logs.api-gateway","confirmed":true,"collected_at":"${HOUR_AGO}","description":"Testing: whether api-gateway 5xx rate rose with the auth middleware change. Expected if true: elevated 5xx share on the auth path. Found: 5xx responses climbed from about 0.4% to 3.1%, concentrated on auth middleware. Why: failures align with the synchronous DB lookup path. Verdict: confirms — api-gateway is failing a subset of auth requests.","evidence":{"esql_query":"FROM logs.api-gateway\n| WHERE http.response.status_code >= 500\n| STATS error_count = COUNT(*)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-002","rule_uuid":"rule-uuid-002","rule_name":"error-rate-increase","change_point_type":"step_change","p_value":0.03}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${TWO_HOURS_AGO}","event_id":"evt-002","event_uuid":"evt-uuid-002","discovery_id":"discovery-002","status":"open","severity":"60-high","confidence":0.88,"stream_names":["metrics.payment-service","logs.payment-service"],"title":"Payment service — memory growth and OOM restarts","summary":"Payment service pods restart about every 45 minutes after OOM kills. Heap grows from about 512MB to 2GB between restarts, starting after the transaction batching feature was enabled. Payment processing is interrupted on each restart.","symptom_hypothesis":"Transaction batching keeps uncommitted transaction references in an unbounded array and never releases them after commit.","causal_features":[{"feature_id":"payment-service","name":"payment-service","stream_name":"metrics.payment-service"}],"signals":[{"type":"detection","stream_name":"metrics.payment-service","confirmed":true,"collected_at":"${TWO_HOURS_AGO}","description":"Testing: whether payment-service heap grows without bound between restarts. Expected if true: linear heap climb toward the OOM threshold. Found: heap grows from about 512MB to 2GB between restarts, tracking the batching rollout. Why: growth correlates with retained transaction references. Verdict: confirms — memory pressure is driving the restart cycle.","evidence":{"esql_query":"FROM metrics.payment-service\n| WHERE service.name == \"payment-service\"\n| STATS max_heap = MAX(jvm.memory.heap.used)\n  BY minute = BUCKET(@timestamp, 5 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-003","rule_uuid":"rule-uuid-003","rule_name":"memory-growth-linear","change_point_type":"trend_change","p_value":0.02}},{"type":"detection","stream_name":"logs.payment-service","confirmed":true,"collected_at":"${TWO_HOURS_AGO}","description":"Testing: whether payment-service pods are restarting after OOM kills. Expected if true: clustered OOMKilled events. Found: six restarts in the last four hours, each preceded by an OOM kill. Why: restarts follow the heap climb. Verdict: confirms — payment processing is interrupted by restarts.","evidence":{"esql_query":"FROM logs.payment-service\n| WHERE message LIKE \"*OOMKilled*\"\n| STATS restarts = COUNT(*)\n  BY pod = kubernetes.pod.name\n| SORT restarts DESC","result":"found"},"metadata":{"detection_id":"det-004","rule_uuid":"rule-uuid-004","rule_name":"pod-restart-frequency","change_point_type":"spike","p_value":0.04}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${THREE_HOURS_AGO}","event_id":"evt-003","event_uuid":"evt-uuid-003","discovery_id":"discovery-003","status":"open","severity":"80-critical","confidence":0.95,"stream_names":["metrics.elasticsearch-cluster","logs.elasticsearch"],"title":"Elasticsearch cluster — disk watermark write throttling","summary":"Disk usage crossed the high watermark on three of five data nodes. Write throttling engaged and upstream log ingestion is back-pressured, with data loss in the pipeline.","symptom_hypothesis":"An ILM retention misconfiguration left long-lived indices active after a lifecycle migration, exhausting disk.","causal_features":[{"feature_id":"elasticsearch-data","name":"Elasticsearch data nodes","stream_name":"metrics.elasticsearch-cluster"}],"signals":[{"type":"detection","stream_name":"metrics.elasticsearch-cluster","confirmed":true,"collected_at":"${THREE_HOURS_AGO}","description":"Testing: whether Elasticsearch data nodes crossed the disk high watermark. Expected if true: disk used above 85% on multiple nodes. Found: three of five data nodes above the watermark with write throttling engaged. Why: free space fell under the watermark threshold. Verdict: confirms — cluster writes are being throttled.","evidence":{"esql_query":"FROM metrics.elasticsearch-cluster\n| WHERE elasticsearch.node.stats.fs.total.available_in_bytes IS NOT NULL\n| EVAL disk_used_pct = 100 - (elasticsearch.node.stats.fs.total.available_in_bytes / elasticsearch.node.stats.fs.total.total_in_bytes * 100)\n| WHERE disk_used_pct > 85\n| KEEP @timestamp, elasticsearch.node.name, disk_used_pct\n| SORT @timestamp DESC","result":"found"},"metadata":{"detection_id":"det-005","rule_uuid":"rule-uuid-005","rule_name":"disk-watermark-breach","change_point_type":"step_change","p_value":0.01}},{"type":"detection","stream_name":"logs.elasticsearch","confirmed":true,"collected_at":"${THREE_HOURS_AGO}","description":"Testing: whether bulk write rejections rose after throttling engaged. Expected if true: es_rejected_execution_exception spikes. Found: bulk write rejections around 240/min once throttling engaged. Why: rejections track the watermark breach. Verdict: confirms — upstream ingestion is back-pressured.","evidence":{"esql_query":"FROM logs.elasticsearch\n| WHERE message LIKE \"*es_rejected_execution_exception*\"\n| STATS rejections = COUNT(*)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-006","rule_uuid":"rule-uuid-006","rule_name":"write-rejection-rate","change_point_type":"spike","p_value":0.02}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${SIX_HOURS_AGO}","event_id":"evt-004","event_uuid":"evt-uuid-004","discovery_id":"discovery-004","status":"closed","severity":"60-high","confidence":0.90,"stream_names":["logs.dns-resolver","metrics.network"],"title":"DNS resolver — intermittent resolution failures","summary":"DNS resolution failures for internal service names spiked in us-east-1 AZ-b and caused cascading timeouts in service-to-service calls. Capacity was restored after CoreDNS scaled back up.","symptom_hypothesis":"CoreDNS capacity dropped below peak demand during a node maintenance window.","causal_features":[{"feature_id":"coredns","name":"CoreDNS","stream_name":"logs.dns-resolver"}],"signals":[{"type":"detection","stream_name":"logs.dns-resolver","confirmed":true,"collected_at":"${SIX_HOURS_AGO}","description":"Testing: whether internal DNS SERVFAIL rate spiked during the CoreDNS scale-down. Expected if true: elevated SERVFAIL share in AZ-b. Found: failures reached about 12% of queries in us-east-1 AZ-b during the window. Why: failures align with reduced CoreDNS replicas. Verdict: confirms — internal name resolution was degraded.","evidence":{"esql_query":"FROM logs.dns-resolver\n| WHERE dns.response_code == \"SERVFAIL\"\n| STATS failures = COUNT(*)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-007","rule_uuid":"rule-uuid-007","rule_name":"dns-failure-rate","change_point_type":"dip","p_value":0.05}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${YESTERDAY}","event_id":"evt-005","event_uuid":"evt-uuid-005","discovery_id":"discovery-005","status":"closed","severity":"40-medium","confidence":0.97,"stream_names":["logs.ingress-controller"],"title":"Ingress controller — TLS certificate near expiry","summary":"The wildcard certificate for internal ingress hostnames was within 48 hours of expiry after automated renewal failed. Manual renewal restored coverage.","symptom_hypothesis":"cert-manager lost DNS01 solver permissions after an RBAC tightening, so renewal failed silently.","causal_features":[{"feature_id":"ingress-controller","name":"Ingress controller","stream_name":"logs.ingress-controller"}],"signals":[{"type":"detection","stream_name":"logs.ingress-controller","confirmed":true,"collected_at":"${YESTERDAY}","description":"Testing: whether ingress is emitting certificate expiry warnings for the wildcard cert. Expected if true: expiry-related messages near the renewal deadline. Found: warnings that the wildcard cert was within 48 hours of expiry while cert-manager renewal failed. Why: messages name the failing renewal path. Verdict: confirms — TLS for internal hostnames was at risk.","evidence":{"esql_query":"FROM logs.ingress-controller\n| WHERE message LIKE \"*certificate*expir*\"\n| KEEP @timestamp, message\n| SORT @timestamp DESC","result":"found"},"metadata":{"detection_id":"det-008","rule_uuid":"rule-uuid-008","rule_name":"cert-expiry-warning","change_point_type":"stationary","p_value":0.08}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${HOUR_AGO}","event_id":"evt-006","event_uuid":"evt-uuid-006","discovery_id":"discovery-006","status":"open","severity":"60-high","confidence":0.86,"stream_names":["metrics.kafka-cluster","logs.order-processing"],"title":"Order processing — Kafka consumer lag growth","summary":"Consumer group order-processors lag on partitions 0-7 grew to about 2.4M messages while processing rate fell from about 15k/s to 3k/s after a brief schema registry outage. Backlog is still growing.","symptom_hypothesis":"Consumers entered deserialisation retry loops with exponential backoff after the schema registry blip and never recovered throughput.","causal_features":[{"feature_id":"order-processors","name":"order-processors","stream_name":"metrics.kafka-cluster"}],"signals":[{"type":"detection","stream_name":"metrics.kafka-cluster","confirmed":true,"collected_at":"${HOUR_AGO}","description":"Testing: whether order-processors consumer lag is growing without bound. Expected if true: monotonic lag climb on partitions 0-7. Found: lag grew to about 2.4M messages after the schema registry outage. Why: lag climb follows failed deserialisation retries. Verdict: confirms — order processing is falling behind.","evidence":{"esql_query":"FROM metrics.kafka-cluster\n| WHERE kafka.consumergroup.id == \"order-processors\"\n| STATS max_lag = MAX(kafka.consumergroup.lag)\n  BY partition = kafka.partition.id, minute = BUCKET(@timestamp, 5 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-009","rule_uuid":"rule-uuid-009","rule_name":"consumer-lag-growth","change_point_type":"trend_change","p_value":0.01}},{"type":"detection","stream_name":"logs.order-processing","confirmed":true,"collected_at":"${HOUR_AGO}","description":"Testing: whether order processing throughput dropped after the registry outage. Expected if true: sustained drop in message_processed rate. Found: rate fell from about 15k/s to 3k/s as consumers entered retry loops. Why: throughput drop tracks deserialisation failures. Verdict: confirms — order handling capacity is reduced.","evidence":{"esql_query":"FROM logs.order-processing\n| WHERE event.action == \"message_processed\"\n| STATS rate = COUNT(*)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-010","rule_uuid":"rule-uuid-010","rule_name":"throughput-degradation","change_point_type":"dip","p_value":0.03}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${TWO_HOURS_AGO}","event_id":"evt-007","event_uuid":"evt-uuid-007","discovery_id":"discovery-007","status":"dismissed","severity":"20-low","confidence":0.38,"stream_names":["metrics.cache-service"],"title":"Cache layer — brief hit-rate dip (dismissed)","summary":"Redis cache hit rate dipped for about eight minutes during a routine node replacement. Throughput and error rates stayed flat; no user-facing impact was observed.","symptom_hypothesis":"Planned cache node drain caused a transient hit-rate dip that recovered once the replacement node joined the cluster.","causal_features":[{"feature_id":"cache-service","name":"cache-service","stream_name":"metrics.cache-service"}],"signals":[{"type":"detection","stream_name":"metrics.cache-service","confirmed":false,"collected_at":"${TWO_HOURS_AGO}","description":"Testing: whether cache hit rate dropped below baseline during the node replacement. Expected if true: sustained dip without recovery. Found: an eight-minute dip that fully recovered. Why: timing aligns with a planned node drain. Verdict: does not confirm — dismissed as benign maintenance noise.","evidence":{"esql_query":"FROM metrics.cache-service\n| WHERE service.name == \"cache-service\"\n| STATS hit_rate = AVG(cache.hit_rate)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| SORT minute DESC","result":"empty"},"metadata":{"detection_id":"det-011","rule_uuid":"rule-uuid-011","rule_name":"cache-hit-rate-dip","change_point_type":"dip","p_value":0.12}}],"kibana.space_ids":["default"]}
NDJSON
)

EVENTS_BODY="$(lengthen_significant_events_ndjson "$EVENTS_BODY")"

bulk_index "7 significant events" "$INDEX" "$EVENTS_BODY"
echo "Successfully indexed 7 significant events."

# ---------------------------------------------------------------------------
# Detections (.significant_events-detections)
# ---------------------------------------------------------------------------
DETECTIONS_BODY=$(cat <<NDJSON
{"create":{}}
{"@timestamp":"${TWO_HOURS_AGO}","detection_id":"det-001","rule_uuid":"rule-uuid-001","rule_name":"latency-p95-spike","stream_name":"logs.web-frontend","change_point_type":"spike","p_value":0.01,"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${TWO_HOURS_AGO}","detection_id":"det-002","rule_uuid":"rule-uuid-002","rule_name":"error-rate-increase","stream_name":"logs.api-gateway","change_point_type":"step_change","p_value":0.03,"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${THREE_HOURS_AGO}","detection_id":"det-003","rule_uuid":"rule-uuid-003","rule_name":"memory-growth-linear","stream_name":"metrics.payment-service","change_point_type":"trend_change","p_value":0.02,"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${THREE_HOURS_AGO}","detection_id":"det-004","rule_uuid":"rule-uuid-004","rule_name":"pod-restart-frequency","stream_name":"logs.payment-service","change_point_type":"spike","p_value":0.04,"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${SIX_HOURS_AGO}","detection_id":"det-005","rule_uuid":"rule-uuid-005","rule_name":"disk-watermark-breach","stream_name":"metrics.elasticsearch-cluster","change_point_type":"step_change","p_value":0.01,"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${SIX_HOURS_AGO}","detection_id":"det-006","rule_uuid":"rule-uuid-006","rule_name":"write-rejection-rate","stream_name":"logs.elasticsearch","change_point_type":"spike","p_value":0.02,"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${YESTERDAY}","detection_id":"det-007","rule_uuid":"rule-uuid-007","rule_name":"dns-failure-rate","stream_name":"logs.dns-resolver","change_point_type":"dip","p_value":0.05,"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${YESTERDAY}","detection_id":"det-008","rule_uuid":"rule-uuid-008","rule_name":"cert-expiry-warning","stream_name":"logs.ingress-controller","change_point_type":"stationary","p_value":0.08,"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${TWO_HOURS_AGO}","detection_id":"det-009","rule_uuid":"rule-uuid-009","rule_name":"consumer-lag-growth","stream_name":"metrics.kafka-cluster","change_point_type":"trend_change","p_value":0.01,"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${TWO_HOURS_AGO}","detection_id":"det-010","rule_uuid":"rule-uuid-010","rule_name":"throughput-degradation","stream_name":"logs.order-processing","change_point_type":"dip","p_value":0.03,"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${TWO_HOURS_AGO}","detection_id":"det-011","rule_uuid":"rule-uuid-011","rule_name":"cache-hit-rate-dip","stream_name":"metrics.cache-service","change_point_type":"dip","p_value":0.12,"kibana.space_ids":["default"]}
NDJSON
)

bulk_index "11 detections" "$DETECTIONS_INDEX" "$DETECTIONS_BODY"
echo "Successfully indexed 11 detections."

# ---------------------------------------------------------------------------
# Discoveries (.significant_events-discoveries)
# ---------------------------------------------------------------------------
DISCOVERIES_BODY=$(cat <<NDJSON
{"create":{}}
{"@timestamp":"${TWO_HOURS_AGO}","kind":"discovery","discovery_id":"discovery-001","event_id":"evt-001","processed":true,"severity":"80-critical","confidence":0.92,"stream_names":["logs.web-frontend","logs.api-gateway"],"title":"Web frontend — login and browse latency","summary":"P95 latency jumped from about 120ms to 890ms on web-frontend and api-gateway around the api-gateway v2.8.1 rollout. Checkout and browse flows are degraded for web users, with no recovery yet.","symptom_hypothesis":"Api-gateway auth middleware is doing a synchronous database lookup that blocks the event loop under load after the v2.8.1 deploy.","causal_features":[{"feature_id":"web-frontend","name":"web-frontend","stream_name":"logs.web-frontend"},{"feature_id":"api-gateway","name":"api-gateway","stream_name":"logs.api-gateway"}],"signals":[{"type":"detection","stream_name":"logs.web-frontend","confirmed":true,"collected_at":"${HOUR_AGO}","description":"Testing: whether web-frontend request latency spiked with the api-gateway rollout. Expected if true: sustained P95 above the prior baseline. Found: P95 rose from about 120ms to 890ms within ten minutes of the deploy. Why: latency tracks the auth middleware path on the new build. Verdict: confirms — login and browse are slowed for users hitting web-frontend.","evidence":{"esql_query":"FROM logs.web-frontend\n| WHERE service.name == \"web-frontend\"\n  AND transaction.type == \"request\"\n| STATS p95_latency = PERCENTILE(transaction.duration.us, 95)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| WHERE p95_latency > 300000\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-001","rule_uuid":"rule-uuid-001","rule_name":"latency-p95-spike","change_point_type":"spike","p_value":0.01}},{"type":"detection","stream_name":"logs.api-gateway","confirmed":true,"collected_at":"${HOUR_AGO}","description":"Testing: whether api-gateway 5xx rate rose with the auth middleware change. Expected if true: elevated 5xx share on the auth path. Found: 5xx responses climbed from about 0.4% to 3.1%, concentrated on auth middleware. Why: failures align with the synchronous DB lookup path. Verdict: confirms — api-gateway is failing a subset of auth requests.","evidence":{"esql_query":"FROM logs.api-gateway\n| WHERE http.response.status_code >= 500\n| STATS error_count = COUNT(*)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-002","rule_uuid":"rule-uuid-002","rule_name":"error-rate-increase","change_point_type":"step_change","p_value":0.03}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${THREE_HOURS_AGO}","kind":"discovery","discovery_id":"discovery-002","event_id":"evt-002","processed":true,"severity":"60-high","confidence":0.88,"stream_names":["metrics.payment-service","logs.payment-service"],"title":"Payment service — memory growth and OOM restarts","summary":"Payment service pods restart about every 45 minutes after OOM kills. Heap grows from about 512MB to 2GB between restarts, starting after the transaction batching feature was enabled. Payment processing is interrupted on each restart.","symptom_hypothesis":"Transaction batching keeps uncommitted transaction references in an unbounded array and never releases them after commit.","causal_features":[{"feature_id":"payment-service","name":"payment-service","stream_name":"metrics.payment-service"}],"signals":[{"type":"detection","stream_name":"metrics.payment-service","confirmed":true,"collected_at":"${TWO_HOURS_AGO}","description":"Testing: whether payment-service heap grows without bound between restarts. Expected if true: linear heap climb toward the OOM threshold. Found: heap grows from about 512MB to 2GB between restarts, tracking the batching rollout. Why: growth correlates with retained transaction references. Verdict: confirms — memory pressure is driving the restart cycle.","evidence":{"esql_query":"FROM metrics.payment-service\n| WHERE service.name == \"payment-service\"\n| STATS max_heap = MAX(jvm.memory.heap.used)\n  BY minute = BUCKET(@timestamp, 5 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-003","rule_uuid":"rule-uuid-003","rule_name":"memory-growth-linear","change_point_type":"trend_change","p_value":0.02}},{"type":"detection","stream_name":"logs.payment-service","confirmed":true,"collected_at":"${TWO_HOURS_AGO}","description":"Testing: whether payment-service pods are restarting after OOM kills. Expected if true: clustered OOMKilled events. Found: six restarts in the last four hours, each preceded by an OOM kill. Why: restarts follow the heap climb. Verdict: confirms — payment processing is interrupted by restarts.","evidence":{"esql_query":"FROM logs.payment-service\n| WHERE message LIKE \"*OOMKilled*\"\n| STATS restarts = COUNT(*)\n  BY pod = kubernetes.pod.name\n| SORT restarts DESC","result":"found"},"metadata":{"detection_id":"det-004","rule_uuid":"rule-uuid-004","rule_name":"pod-restart-frequency","change_point_type":"spike","p_value":0.04}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${SIX_HOURS_AGO}","kind":"discovery","discovery_id":"discovery-003","event_id":"evt-003","processed":true,"severity":"80-critical","confidence":0.95,"stream_names":["metrics.elasticsearch-cluster","logs.elasticsearch"],"title":"Elasticsearch cluster — disk watermark write throttling","summary":"Disk usage crossed the high watermark on three of five data nodes. Write throttling engaged and upstream log ingestion is back-pressured, with data loss in the pipeline.","symptom_hypothesis":"An ILM retention misconfiguration left long-lived indices active after a lifecycle migration, exhausting disk.","causal_features":[{"feature_id":"elasticsearch-data","name":"Elasticsearch data nodes","stream_name":"metrics.elasticsearch-cluster"}],"signals":[{"type":"detection","stream_name":"metrics.elasticsearch-cluster","confirmed":true,"collected_at":"${THREE_HOURS_AGO}","description":"Testing: whether Elasticsearch data nodes crossed the disk high watermark. Expected if true: disk used above 85% on multiple nodes. Found: three of five data nodes above the watermark with write throttling engaged. Why: free space fell under the watermark threshold. Verdict: confirms — cluster writes are being throttled.","evidence":{"esql_query":"FROM metrics.elasticsearch-cluster\n| WHERE elasticsearch.node.stats.fs.total.available_in_bytes IS NOT NULL\n| EVAL disk_used_pct = 100 - (elasticsearch.node.stats.fs.total.available_in_bytes / elasticsearch.node.stats.fs.total.total_in_bytes * 100)\n| WHERE disk_used_pct > 85\n| KEEP @timestamp, elasticsearch.node.name, disk_used_pct\n| SORT @timestamp DESC","result":"found"},"metadata":{"detection_id":"det-005","rule_uuid":"rule-uuid-005","rule_name":"disk-watermark-breach","change_point_type":"step_change","p_value":0.01}},{"type":"detection","stream_name":"logs.elasticsearch","confirmed":true,"collected_at":"${THREE_HOURS_AGO}","description":"Testing: whether bulk write rejections rose after throttling engaged. Expected if true: es_rejected_execution_exception spikes. Found: bulk write rejections around 240/min once throttling engaged. Why: rejections track the watermark breach. Verdict: confirms — upstream ingestion is back-pressured.","evidence":{"esql_query":"FROM logs.elasticsearch\n| WHERE message LIKE \"*es_rejected_execution_exception*\"\n| STATS rejections = COUNT(*)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-006","rule_uuid":"rule-uuid-006","rule_name":"write-rejection-rate","change_point_type":"spike","p_value":0.02}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${YESTERDAY}","kind":"discovery","discovery_id":"discovery-004","event_id":"evt-004","processed":true,"severity":"60-high","confidence":0.90,"stream_names":["logs.dns-resolver","metrics.network"],"title":"DNS resolver — intermittent resolution failures","summary":"DNS resolution failures for internal service names spiked in us-east-1 AZ-b and caused cascading timeouts in service-to-service calls. Capacity was restored after CoreDNS scaled back up.","symptom_hypothesis":"CoreDNS capacity dropped below peak demand during a node maintenance window.","causal_features":[{"feature_id":"coredns","name":"CoreDNS","stream_name":"logs.dns-resolver"}],"signals":[{"type":"detection","stream_name":"logs.dns-resolver","confirmed":true,"collected_at":"${SIX_HOURS_AGO}","description":"Testing: whether internal DNS SERVFAIL rate spiked during the CoreDNS scale-down. Expected if true: elevated SERVFAIL share in AZ-b. Found: failures reached about 12% of queries in us-east-1 AZ-b during the window. Why: failures align with reduced CoreDNS replicas. Verdict: confirms — internal name resolution was degraded.","evidence":{"esql_query":"FROM logs.dns-resolver\n| WHERE dns.response_code == \"SERVFAIL\"\n| STATS failures = COUNT(*)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-007","rule_uuid":"rule-uuid-007","rule_name":"dns-failure-rate","change_point_type":"dip","p_value":0.05}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${YESTERDAY}","kind":"discovery","discovery_id":"discovery-005","event_id":"evt-005","processed":true,"severity":"40-medium","confidence":0.97,"stream_names":["logs.ingress-controller"],"title":"Ingress controller — TLS certificate near expiry","summary":"The wildcard certificate for internal ingress hostnames was within 48 hours of expiry after automated renewal failed. Manual renewal restored coverage.","symptom_hypothesis":"cert-manager lost DNS01 solver permissions after an RBAC tightening, so renewal failed silently.","causal_features":[{"feature_id":"ingress-controller","name":"Ingress controller","stream_name":"logs.ingress-controller"}],"signals":[{"type":"detection","stream_name":"logs.ingress-controller","confirmed":true,"collected_at":"${YESTERDAY}","description":"Testing: whether ingress is emitting certificate expiry warnings for the wildcard cert. Expected if true: expiry-related messages near the renewal deadline. Found: warnings that the wildcard cert was within 48 hours of expiry while cert-manager renewal failed. Why: messages name the failing renewal path. Verdict: confirms — TLS for internal hostnames was at risk.","evidence":{"esql_query":"FROM logs.ingress-controller\n| WHERE message LIKE \"*certificate*expir*\"\n| KEEP @timestamp, message\n| SORT @timestamp DESC","result":"found"},"metadata":{"detection_id":"det-008","rule_uuid":"rule-uuid-008","rule_name":"cert-expiry-warning","change_point_type":"stationary","p_value":0.08}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${TWO_HOURS_AGO}","kind":"discovery","discovery_id":"discovery-006","event_id":"evt-006","processed":true,"severity":"60-high","confidence":0.86,"stream_names":["metrics.kafka-cluster","logs.order-processing"],"title":"Order processing — Kafka consumer lag growth","summary":"Consumer group order-processors lag on partitions 0-7 grew to about 2.4M messages while processing rate fell from about 15k/s to 3k/s after a brief schema registry outage. Backlog is still growing.","symptom_hypothesis":"Consumers entered deserialisation retry loops with exponential backoff after the schema registry blip and never recovered throughput.","causal_features":[{"feature_id":"order-processors","name":"order-processors","stream_name":"metrics.kafka-cluster"}],"signals":[{"type":"detection","stream_name":"metrics.kafka-cluster","confirmed":true,"collected_at":"${HOUR_AGO}","description":"Testing: whether order-processors consumer lag is growing without bound. Expected if true: monotonic lag climb on partitions 0-7. Found: lag grew to about 2.4M messages after the schema registry outage. Why: lag climb follows failed deserialisation retries. Verdict: confirms — order processing is falling behind.","evidence":{"esql_query":"FROM metrics.kafka-cluster\n| WHERE kafka.consumergroup.id == \"order-processors\"\n| STATS max_lag = MAX(kafka.consumergroup.lag)\n  BY partition = kafka.partition.id, minute = BUCKET(@timestamp, 5 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-009","rule_uuid":"rule-uuid-009","rule_name":"consumer-lag-growth","change_point_type":"trend_change","p_value":0.01}},{"type":"detection","stream_name":"logs.order-processing","confirmed":true,"collected_at":"${HOUR_AGO}","description":"Testing: whether order processing throughput dropped after the registry outage. Expected if true: sustained drop in message_processed rate. Found: rate fell from about 15k/s to 3k/s as consumers entered retry loops. Why: throughput drop tracks deserialisation failures. Verdict: confirms — order handling capacity is reduced.","evidence":{"esql_query":"FROM logs.order-processing\n| WHERE event.action == \"message_processed\"\n| STATS rate = COUNT(*)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| SORT minute DESC","result":"found"},"metadata":{"detection_id":"det-010","rule_uuid":"rule-uuid-010","rule_name":"throughput-degradation","change_point_type":"dip","p_value":0.03}}],"kibana.space_ids":["default"]}
{"create":{}}
{"@timestamp":"${TWO_HOURS_AGO}","kind":"discovery","discovery_id":"discovery-007","event_id":"evt-007","processed":true,"severity":"20-low","confidence":0.38,"stream_names":["metrics.cache-service"],"title":"Cache layer — brief hit-rate dip (dismissed)","summary":"Redis cache hit rate dipped for about eight minutes during a routine node replacement. Throughput and error rates stayed flat; no user-facing impact was observed.","symptom_hypothesis":"Planned cache node drain caused a transient hit-rate dip that recovered once the replacement node joined the cluster.","causal_features":[{"feature_id":"cache-service","name":"cache-service","stream_name":"metrics.cache-service"}],"signals":[{"type":"detection","stream_name":"metrics.cache-service","confirmed":false,"collected_at":"${TWO_HOURS_AGO}","description":"Testing: whether cache hit rate dropped below baseline during the node replacement. Expected if true: sustained dip without recovery. Found: an eight-minute dip that fully recovered. Why: timing aligns with a planned node drain. Verdict: does not confirm — dismissed as benign maintenance noise.","evidence":{"esql_query":"FROM metrics.cache-service\n| WHERE service.name == \"cache-service\"\n| STATS hit_rate = AVG(cache.hit_rate)\n  BY minute = BUCKET(@timestamp, 1 minute)\n| SORT minute DESC","result":"empty"},"metadata":{"detection_id":"det-011","rule_uuid":"rule-uuid-011","rule_name":"cache-hit-rate-dip","change_point_type":"dip","p_value":0.12}}],"kibana.space_ids":["default"]}
NDJSON
)

DISCOVERIES_BODY="$(lengthen_significant_events_ndjson "$DISCOVERIES_BODY")"

bulk_index "7 discoveries" "$DISCOVERIES_INDEX" "$DISCOVERIES_BODY"
echo "Successfully indexed 7 discoveries."

# ---------------------------------------------------------------------------
# Backing stream indices + KI entity features (Python)
# ---------------------------------------------------------------------------
echo ""
echo "Seeding backing stream indices and KI entity features ..."

ES_URL="$ES_URL" ES_AUTH="$ES_AUTH" KIBANA_URL="$KIBANA_URL" python3 "${SCRIPT_DIR}/seed_nightshift_helpers.py"

echo ""
echo "Verifying ..."
for idx in "$INDEX" "$DETECTIONS_INDEX" "$DISCOVERIES_INDEX"; do
  COUNT=$(curl -s -u "$ES_AUTH" "${ES_URL}/${idx}/_count" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count', 0))")
  echo "  ${idx}: ${COUNT} documents"
done

echo ""
echo "Done! Open Nightshift to explore:"
echo "  - Need action: open critical/high events (evt-001 … evt-006)"
echo "  - Resolved: closed events (evt-004, evt-005) and dismissed evt-007"
echo "  - Event flyout → detection flyout → entity pill for KI-backed entities"
echo ""
echo "Tip: re-run with --clean to wipe and re-seed from scratch."
