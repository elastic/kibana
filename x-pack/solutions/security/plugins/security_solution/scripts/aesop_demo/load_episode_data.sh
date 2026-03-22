#!/bin/bash
#
# AESOP Demo Data Loader
# Loads existing episode data (ep1-ep8) for AESOP demonstration
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EPISODES_DIR="${SCRIPT_DIR}/../../data/episodes/attacks"
ES_URL="${ES_URL:-http://localhost:9200}"
ES_USER="${ES_USERNAME:-elastic}"
ES_PASS="${ES_PASSWORD:-changeme}"

echo "📁 Loading AESOP Demo Data from Episodes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Elasticsearch is available
if ! curl -s -u "$ES_USER:$ES_PASS" "$ES_URL" > /dev/null 2>&1; then
    echo "❌ Elasticsearch not available at $ES_URL"
    exit 1
fi

echo "✓ Elasticsearch available at $ES_URL"
echo ""

# Load episode alerts
echo "📊 Loading episode alerts..."
for file in "$EPISODES_DIR"/ep*alerts.ndjson.gz; do
    if [ -f "$file" ]; then
        episode=$(basename "$file" | sed 's/alerts.ndjson.gz//')
        echo "  Loading $episode alerts..."

        # Decompress and bulk index
        gunzip -c "$file" | \
        jq -c '. | {index: {_index: ".internal.alerts-security.alerts-default-000001"}}, .' | \
        curl -s -u "$ES_USER:$ES_PASS" \
            -X POST "$ES_URL/_bulk" \
            -H "Content-Type: application/x-ndjson" \
            --data-binary @- > /dev/null
    fi
done

echo "  ✓ Episode alerts loaded"
echo ""

# Create persona behaviors index
echo "👥 Creating persona query patterns..."

curl -s -u "$ES_USER:$ES_PASS" \
    -X PUT "$ES_URL/.aesop-persona-behaviors" \
    -H "Content-Type: application/json" \
    -d '{
  "mappings": {
    "properties": {
      "@timestamp": {"type": "date"},
      "persona_id": {"type": "keyword"},
      "persona_name": {"type": "text"},
      "persona_role": {"type": "keyword"},
      "query_type": {"type": "keyword"},
      "target_index": {"type": "keyword"},
      "entity_queried": {"type": "keyword"},
      "result_count": {"type": "long"},
      "duration_ms": {"type": "long"}
    }
  }
}' > /dev/null 2>&1 || echo "  (Index may already exist)"

# Generate sample persona behaviors
echo "  Generating persona query patterns..."

cat << 'EOF' | curl -s -u "$ES_USER:$ES_PASS" \
    -X POST "$ES_URL/.aesop-persona-behaviors/_bulk" \
    -H "Content-Type: application/x-ndjson" \
    --data-binary @- > /dev/null
{"index":{}}
{"@timestamp":"2026-03-21T08:00:00Z","persona_id":"alice_soc_l3","persona_name":"Alice (SOC L3)","persona_role":"soc_analyst","query_type":"triage_high_severity_alerts","target_index":".alerts-security.alerts-*","entity_queried":"alert","result_count":45,"duration_ms":1200}
{"index":{}}
{"@timestamp":"2026-03-21T08:15:00Z","persona_id":"alice_soc_l3","persona_name":"Alice (SOC L3)","persona_role":"soc_analyst","query_type":"investigate_suspicious_ips","target_index":".alerts-security.alerts-*","entity_queried":"ip","result_count":12,"duration_ms":2100}
{"index":{}}
{"@timestamp":"2026-03-21T08:30:00Z","persona_id":"alice_soc_l3","persona_name":"Alice (SOC L3)","persona_role":"soc_analyst","query_type":"correlate_related_alerts","target_index":".alerts-security.alerts-*","entity_queried":"host","result_count":8,"duration_ms":1800}
{"index":{}}
{"@timestamp":"2026-03-21T09:00:00Z","persona_id":"alice_soc_l3","persona_name":"Alice (SOC L3)","persona_role":"soc_analyst","query_type":"map_to_mitre_attack","target_index":".alerts-security.alerts-*","entity_queried":"alert","result_count":22,"duration_ms":900}
{"index":{}}
{"@timestamp":"2026-03-21T09:30:00Z","persona_id":"alice_soc_l3","persona_name":"Alice (SOC L3)","persona_role":"soc_analyst","query_type":"enrich_with_threat_intel","target_index":".alerts-security.alerts-*","entity_queried":"ip","result_count":15,"duration_ms":3200}
{"index":{}}
{"@timestamp":"2026-03-21T10:00:00Z","persona_id":"bob_sre","persona_name":"Bob (SRE)","persona_role":"sre","query_type":"monitor_service_performance","target_index":"metrics-apm*","entity_queried":"service","result_count":50,"duration_ms":450}
{"index":{}}
{"@timestamp":"2026-03-21T10:30:00Z","persona_id":"bob_sre","persona_name":"Bob (SRE)","persona_role":"sre","query_type":"investigate_anomalies","target_index":"traces-apm*","entity_queried":"trace","result_count":5,"duration_ms":2800}
{"index":{}}
{"@timestamp":"2026-03-21T11:00:00Z","persona_id":"charlie_dev","persona_name":"Charlie (Developer)","persona_role":"developer","query_type":"debug_application_errors","target_index":"logs-*","entity_queried":"log","result_count":12,"duration_ms":1500}
EOF

echo "  ✓ Persona behaviors created"
echo ""

# Verify data loaded
echo "✅ Verification:"
ALERT_COUNT=$(curl -s -u "$ES_USER:$ES_PASS" "$ES_URL/.alerts-*/_count" | jq -r '.count' 2>/dev/null || echo "0")
PERSONA_COUNT=$(curl -s -u "$ES_USER:$ES_PASS" "$ES_URL/.aesop-persona-behaviors/_count" | jq -r '.count' 2>/dev/null || echo "0")

echo "  Security alerts: $ALERT_COUNT"
echo "  Persona behaviors: $PERSONA_COUNT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ AESOP Demo Data Ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next: Trigger self-exploration"
echo "   POST /internal/aesop/exploration/run"
echo ""
